/**
 * CrisisLens App — React Router + React Query + Error Boundary.
 */
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardLayout from './layouts/DashboardLayout';

const HomePage = lazy(() => import('./pages/HomePage'));
const RiskMonitorPage = lazy(() => import('./pages/RiskMonitorPage'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const WorldMapPage = lazy(() => import('./pages/WorldMapPage'));
const CrossMarketPage = lazy(() => import('./pages/CrossMarketPage'));
const ModelPerformancePage = lazy(() => import('./pages/ModelPerformancePage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 30_000,
      staleTime: 15_000,
      retry: 2,
    },
  },
});

/* ── Error Boundary ─────────────────────────────────────── */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('CrisisLens Error:', error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100vh', background: '#0a0b0f', color: '#fff', fontFamily: 'Inter, sans-serif',
          padding: 40, textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>CrisisLens — Something went wrong</h1>
          <p style={{ color: '#999', fontSize: 14, maxWidth: 500, lineHeight: 1.6 }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{
              marginTop: 20, padding: '10px 24px', background: '#6366f1', color: '#fff',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600,
            }}
          >
            Reload Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', background: '#0a0b0f', fontFamily: 'Inter, sans-serif'}}>Loading CrisisLens...</div>}>
            <Routes>
              <Route element={<DashboardLayout />}>
                <Route index element={<HomePage />} />
                <Route path="/risk" element={<RiskMonitorPage />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/map" element={<WorldMapPage />} />
                <Route path="/cross-market" element={<CrossMarketPage />} />
                <Route path="/performance" element={<ModelPerformancePage />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
