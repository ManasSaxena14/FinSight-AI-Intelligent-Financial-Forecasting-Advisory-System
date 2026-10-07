import React from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[FinSight AI] Rendering error:', error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ink-900 p-6">
        <div className="panel w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl border border-neg/30 bg-neg/10 text-neg">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-medium">Something went wrong</h2>
          <p className="mt-2 text-sm text-fg-muted">The page hit an unexpected error. Reloading usually fixes it.</p>
          <div className="mt-6 flex flex-col gap-2">
            <button onClick={() => window.location.reload()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-brand-300 to-brand-500 text-sm font-medium text-ink-950">
              <RefreshCw className="h-4 w-4" /> Reload
            </button>
            <button onClick={() => { window.location.href = '/'; }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm text-fg-muted hover:text-fg">
              <Home className="h-4 w-4" /> Back to overview
            </button>
          </div>
          {import.meta.env.DEV && (
            <pre className="mt-6 max-h-40 overflow-auto rounded-xl border border-line bg-black/40 p-3 text-left text-[11px] text-neg/80">
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
