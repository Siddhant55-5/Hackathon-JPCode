"""Risk Scoring Service — orchestrates feature building, ML prediction,
CI computation, SHAP explanation, and alert evaluation.

Called on a schedule and also available for on-demand simulation.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import numpy as np
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory
from app.models.alert import RiskScore
from app.models.signal import Signal
from ml.explainer import shap_explainer
from ml.features import FeatureBuilder, FeatureVector
from ml.models.ci_calculator import ci_calculator
from ml.models.ensemble_model import ensemble

logger = logging.getLogger(__name__)

feature_builder = FeatureBuilder()


async def compute_risk_scores(
    session: AsyncSession | None = None,
    overrides: dict[str, float] | None = None,
) -> list[dict]:
    """Full scoring pipeline: features → predict → CI → SHAP → alert → persist.

    Args:
        session: Optional DB session. Creates one if not provided.
        overrides: Optional signal overrides for simulation mode.

    Returns:
        List of score dicts with crisis_type, score, ci_lower, ci_upper, scored_at.
    """
    own_session = session is None
    if own_session:
        session = async_session_factory()

    try:
        # 1. Build feature vector
        fv = await feature_builder.build(session, overrides=overrides)
        feature_array = fv.to_array()
        feature_names = FeatureVector.feature_names()

        # 2. Compute average quality score for CI widening
        result = await session.execute(select(Signal))
        signals = list(result.scalars().all())
        avg_quality = (
            sum(s.freshness_score for s in signals) / len(signals) if signals else 1.0
        )

        # 3. Predict scores for all crisis types
        scores = ensemble.predict_all(feature_array)

        # 4. Compute confidence intervals
        ci_bounds = ci_calculator.compute_all_ci(
            ensemble.classifiers, feature_array, avg_quality
        )

        # 5. Build response
        results = []
        now = datetime.now(timezone.utc)

        for crisis_type, score in scores.items():
            ci_lower, ci_upper = ci_bounds.get(crisis_type, (0.0, 100.0))

            # 6. SHAP explanation
            classifier = ensemble.classifiers[crisis_type]
            top_shap = shap_explainer.explain(
                classifier, feature_array, feature_names, top_k=5
            )

            # 7. Historical analog
            analog = shap_explainer.find_historical_analog(feature_array)

            score_entry = {
                "crisis_type": crisis_type,
                "score": score,
                "ci_lower": ci_lower,
                "ci_upper": ci_upper,
                "scored_at": now,
                "top_shap": top_shap,
                "historical_analog": analog,
            }
            results.append(score_entry)

            # 8. Persist score (skip for simulation mode)
            if overrides is None:
                risk_score = RiskScore(
                    crisis_type=crisis_type,
                    score=score,
                    ci_lower=ci_lower,
                    ci_upper=ci_upper,
                    feature_snapshot=fv.model_dump(),
                    scored_at=now,
                )
                session.add(risk_score)

                # 9. Alert evaluation
                from app.services.alert_service import alert_engine

                await alert_engine.evaluate(
                    session=session,
                    crisis_type=crisis_type,
                    score=score,
                    ci_lower=ci_lower,
                    ci_upper=ci_upper,
                    top_shap=top_shap,
                    historical_analog=analog,
                )

        if overrides is None:
            await session.commit()

        logger.info(
            "Risk scores computed: %s",
            {ct: f"{s:.1f}" for ct, s in scores.items()},
        )

        return results

    except Exception:
        logger.exception("Risk scoring pipeline failed")
        if own_session:
            await session.rollback()
        return []
    finally:
        if own_session:
            await session.close()


async def get_latest_scores(session: AsyncSession) -> list[RiskScore]:
    """Get the latest score for each crisis type."""
    from app.models.alert import CrisisType

    results = []
    for ct in CrisisType:
        result = await session.execute(
            select(RiskScore)
            .where(RiskScore.crisis_type == ct)
            .order_by(desc(RiskScore.scored_at))
            .limit(1)
        )
        score = result.scalar_one_or_none()
        if score:
            results.append(score)

    return results


async def get_score_history(
    session: AsyncSession,
    days: int = 90,
) -> list[RiskScore]:
    """Get score history for all crisis types over N days."""
    from datetime import timedelta

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    result = await session.execute(
        select(RiskScore)
        .where(RiskScore.scored_at >= cutoff)
        .order_by(RiskScore.scored_at)
    )
    return list(result.scalars().all())


async def run_scoring_cycle() -> None:
    """Scheduled scoring cycle — called by APScheduler."""
    logger.info("Starting scheduled risk scoring cycle...")
    await compute_risk_scores()
    logger.info("Risk scoring cycle complete")
