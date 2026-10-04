import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Home, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends (React.Component as any) {
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[SokoPoS ErrorBoundary] Uncaught runtime error caught:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearStorageAndReset = () => {
    try {
      // Clear all SokoPOS local storage keys
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sokopos_')) {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.clear();
    } catch (e) {
      console.error('Error clearing storage:', e);
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || 'An unexpected application runtime exception occurred.';
      const stack = this.state.error?.stack || this.state.errorInfo?.componentStack || '';

      return (
        <div
          id="pos-error-boundary-screen"
          className="min-h-screen w-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans select-text"
        >
          <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            {/* Top Warning Badge */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm tracking-tight text-white">SokoPoS Terminal Guard</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                    RUNTIME SAFEGUARD
                  </span>
                </div>
                <h1 className="text-lg font-bold text-white mt-0.5">
                  Application Recovery Console
                </h1>
              </div>
            </div>

            {/* Error Message Card */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 mb-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                Error Diagnostics:
              </div>
              <p className="text-xs text-red-300 font-mono break-words leading-relaxed font-semibold">
                {errorMsg}
              </p>

              {stack && (
                <details className="mt-3">
                  <summary className="text-[11px] font-semibold text-slate-400 cursor-pointer hover:text-slate-200">
                    View technical call stack
                  </summary>
                  <pre className="mt-2 p-2.5 rounded-xl bg-black/60 text-[10px] text-slate-400 font-mono overflow-x-auto max-h-40 whitespace-pre-wrap border border-slate-800">
                    {stack}
                  </pre>
                </details>
              )}
            </div>

            {/* Explanatory text */}
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              The POS safeguard caught a UI exception and prevented a system lockup. You can reload the active terminal or clear corrupted local cached state to restore trading operations.
            </p>

            {/* Recovery Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Terminal</span>
              </button>

              <button
                type="button"
                onClick={this.handleClearStorageAndReset}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-amber-400" />
                <span>Reset Local Cache</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
