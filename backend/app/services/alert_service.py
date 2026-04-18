"""Alert Engine — generates and persists alerts on threshold crossings.

Runs after every score update. Thresholds:
  LOW     > 40
  MEDIUM  > 65
  HIGH    > 80
  CRITICAL > 90

Only triggers on threshold *crossing*, not on every tick.
Publishes alerts to Redis Stream "alerts.live".
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import get_redis
from app.models.alert import Alert, AlertSeverity, CrisisType

logger = logging.getLogger(__name__)

ALERT_STREAM = "alerts.live"

# Score thresholds for severity levels
THRESHOLDS = [
    (90.0, AlertSeverity.CRITICAL),
    (80.0, AlertSeverity.HIGH),
    (65.0, AlertSeverity.MEDIUM),
    (40.0, AlertSeverity.LOW),
]

# Recommended actions per severity
RECOMMENDED_ACTIONS: dict[AlertSeverity, list[str]] = {
    AlertSeverity.LOW: [
        "Monitor signal trends over next 24 hours",
        "Review positions in affected asset classes",
    ],
    AlertSeverity.MEDIUM: [
        "Monitor interbank lending spreads closely",
        "Review counterparty exposure reports",
        "Prepare hedging strategy for affected sectors",
    ],
    AlertSeverity.HIGH: [
        "Consider reducing exposure to affected asset class",
        "Increase cash reserves as precautionary measure",
        "Engage risk committee for elevated threat assessment",
        "Review and tighten stop-loss thresholds",
    ],
    AlertSeverity.CRITICAL: [
        "Activate crisis response protocol immediately",
        "Reduce all risk exposure to minimum levels",
        "Convene emergency risk committee meeting",
        "Notify senior management and board risk committee",
        "Prepare liquidity contingency plan",
    ],
}

# Track last triggered severity per crisis type to detect crossings
_last_severity: dict[str, AlertSeverity | None] = {}


def _score_to_severity(score: float) -> AlertSeverity | None:
    """Map a score to its severity level. Returns None if below all thresholds."""
    for threshold, severity in THRESHOLDS:
        if score >= threshold:
            return severity
    return None


class AlertEngine:
    """Evaluates risk scores and triggers alerts on threshold crossings."""

    async def evaluate(
        self,
        session: AsyncSession,
        crisis_type: str,
        score: float,
        ci_lower: float,
        ci_upper: float,
        top_shap: list[dict] | None = None,
        historical_analog: dict | None = None,
    ) -> Alert | None:
        """Check if a threshold crossing occurred and create alert if so.

        Args:
            session: Database session.
            crisis_type: One of BANKING_INSTABILITY, MARKET_CRASH, LIQUIDITY_SHORTAGE.
            score: Current risk score (0–100).
            ci_lower: Lower confidence bound.
            ci_upper: Upper confidence bound.
            top_shap: Top-5 SHAP contributions.
            historical_analog: Nearest historical crisis match.

        Returns:
            Alert if threshold was crossed, None otherwise.
        """
        current_severity = _score_to_severity(score)
        previous_severity = _last_severity.get(crisis_type)

        # Only alert on crossing (new severity or escalation)
        if current_severity is None:
            _last_severity[crisis_type] = None
            return None

        if current_severity == previous_severity:
            # Same severity, no crossing
            return None

        # Severity changed — trigger alert
        _last_severity[crisis_type] = current_severity

        try:
            ct_enum = CrisisType(crisis_type)
        except ValueError:
            logger.error("Unknown crisis type: %s", crisis_type)
            return None

        actions = RECOMMENDED_ACTIONS.get(current_severity, [])

        alert = Alert(
            crisis_type=ct_enum,
            score=score,
            ci_lower=ci_lower,
            ci_upper=ci_upper,
            severity=current_severity,
            top_shap=top_shap or [],
            historical_analog=historical_analog,
            recommended_actions=actions,
            triggered_at=datetime.now(timezone.utc),
        )

        session.add(alert)
        await session.flush()

        # Publish to Redis
        await self._publish_alert(alert)

        logger.warning(
            "🚨 ALERT: %s %s — score=%.1f [%.1f, %.1f]",
            current_severity.value,
            crisis_type,
            score,
            ci_lower,
            ci_upper,
        )

        return alert

    async def _publish_alert(self, alert: Alert) -> None:
        """Publish alert to Redis stream."""
        try:
            r = await get_redis()
            await r.xadd(
                ALERT_STREAM,
                {
                    "alert_id": str(alert.id),
                    "crisis_type": alert.crisis_type.value,
                    "score": str(alert.score),
                    "ci_lower": str(alert.ci_lower),
                    "ci_upper": str(alert.ci_upper),
                    "severity": alert.severity.value,
                    "triggered_at": alert.triggered_at.isoformat(),
                },
                maxlen=5000,
            )
        except Exception:
            logger.exception("Failed to publish alert to Redis")

    async def get_alerts(
        self,
        session: AsyncSession,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Alert]:
        """Retrieve paginated alert history, newest first."""
        result = await session.execute(
            select(Alert)
            .order_by(desc(Alert.triggered_at))
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def get_alert_by_id(
        self,
        session: AsyncSession,
        alert_id: int,
    ) -> Alert | None:
        """Retrieve a single alert by ID."""
        result = await session.execute(
            select(Alert).where(Alert.id == alert_id)
        )
        return result.scalar_one_or_none()


# Singleton
alert_engine = AlertEngine()
