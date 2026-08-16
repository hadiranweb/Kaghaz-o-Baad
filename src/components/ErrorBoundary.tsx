import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Rendering Error:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6" dir="rtl">
          <div className="max-w-md w-full rounded-2xl border border-border/60 bg-card/90 backdrop-blur-md p-6 shadow-elegant text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-semibold font-[IRANSharp] text-foreground">
              خطا در بارگذاری بخش رابط کاربری
            </h2>
            <p className="text-xs text-muted-foreground leading-6">
              متأسفانه در پردازش این بخش خطایی رخ داده است. لطفاً صفحه را بارگذاری مجدد کنید.
            </p>
            {this.state.error && (
              <div
                className="p-3 rounded-lg bg-muted/60 border border-border/40 text-[11px] font-mono text-muted-foreground text-left overflow-x-auto max-h-32"
                dir="ltr"
              >
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
            <div className="pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <RefreshCw className="w-4 h-4" />
                <span>بارگذاری مجدد صفحه (Reload)</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
