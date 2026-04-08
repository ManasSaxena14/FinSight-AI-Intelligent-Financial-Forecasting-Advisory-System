import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './Button';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[FinSight AI] Rendering Error Caught:', error, errorInfo);
  }

  handleReset = () => {
    window.location.href = '/';
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-bg-base p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
          
          <div className="max-w-md w-full glass-card border-none rounded-[3rem] p-12 text-center relative z-10 bg-black/40 backdrop-blur-3xl shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-500/30 to-transparent" />
            
            <div className="mb-10 inline-flex p-6 rounded-[2rem] bg-rose-500/10 border border-rose-500/20 shadow-2xl shadow-rose-500/10">
              <AlertTriangle className="h-10 w-10 text-rose-500" />
            </div>
            
            <h2 className="text-3xl font-black text-text-primary tracking-tighter italic mb-4">
              System Anomaly Detected
            </h2>
            
            <p className="text-sm text-text-tertiary font-medium mb-10 leading-relaxed uppercase tracking-widest text-[10px]">
              The application encountered an unexpected state during synchronization. We've captured the logs for diagnosis.
            </p>
            
            <div className="space-y-4">
              <Button 
                variant="primary" 
                onClick={this.handleReload}
                className="w-full h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-black font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3"
              >
                <RefreshCw className="h-4 w-4" />
                Reload Application
              </Button>
              
              <button 
                onClick={this.handleReset}
                className="w-full py-4 text-[9px] font-black text-text-tertiary uppercase tracking-[0.3em] hover:text-brand-400 transition-colors flex items-center justify-center gap-2"
              >
                <Home className="h-3 w-3" />
                Return to Home
              </button>
            </div>
            
            {import.meta.env.DEV && (
              <div className="mt-10 p-6 rounded-2xl bg-black/40 border border-white/5 text-left overflow-auto max-h-40 custom-scrollbar">
                <p className="text-[9px] font-mono text-rose-400/80 leading-relaxed break-all">
                  {this.state.error?.toString()}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
