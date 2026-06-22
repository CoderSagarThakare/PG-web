import React, { Component } from 'react';
import { useRouteError } from 'react-router-dom';
import toast from 'react-hot-toast';
import { WifiOff, AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './index';

// ── Shared Error Presentation Component ──────────────────────────────────────────
export function ErrorFallbackView({
  title,
  subtitle,
  error,
  icon: Icon = AlertTriangle,
  iconBgColor = 'bg-red-500/10 text-red-500',
  showButtons = true,
  onRetry,
  onHome,
  extraContent
}) {
  return (
    <div className="min-h-screen dark:bg-[#121420] bg-gray-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-[#1a1d2e] border border-gray-200 dark:border-[#2d3052] rounded-2xl shadow-xl max-w-md w-full p-8 text-center flex flex-col items-center gap-5">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${iconBgColor} animate-pulse`}>
          <Icon size={32} />
        </div>
        
        <div>
          <h2 className="text-xl font-black dark:text-[#f0f0f8] text-gray-900 mb-2">{title}</h2>
          <p className="text-[13px] dark:text-[#a0a3b1] text-gray-500 leading-relaxed font-medium">
            {subtitle}
          </p>
        </div>

        {error?.message && (
          <div className="w-full bg-gray-50 dark:bg-[#242740]/30 rounded-xl p-3 text-[11px] font-mono text-left dark:text-[#6b6e82] text-gray-400 max-h-[80px] overflow-y-auto border border-gray-100 dark:border-[#2d3052]/30">
            {error.message}
          </div>
        )}

        {extraContent}

        {showButtons && (
          <div className="flex gap-3 w-full mt-2">
            <Button 
              variant="custom" 
              className="flex-1 font-bold text-[11px] uppercase tracking-wider h-10 rounded-xl bg-gray-100 dark:bg-[#2d3052] text-gray-700 dark:text-[#f0f0f8] border border-gray-200 dark:border-[#2d3052] transition-all hover:bg-gray-200 dark:hover:bg-[#2d3052]/80"
              onClick={onHome || (() => window.location.href = '/')}
            >
              <Home size={14} className="mr-1" /> Home
            </Button>
            <Button 
              variant="custom" 
              className="flex-1 font-bold text-[11px] uppercase tracking-wider h-10 rounded-xl bg-[#6c63ff]/10 hover:bg-[#6c63ff]/20 text-[#6c63ff] border border-[#6c63ff]/25 hover:border-[#6c63ff]/50 transition-all shadow-sm"
              onClick={onRetry || (() => window.location.reload())}
            >
              <RefreshCw size={14} className="mr-1" /> Retry
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 1. Offline Overlay (when navigator.onLine is false) ──────────────────────────
export function OfflineOverlay() {
  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.reload();
    } else {
      toast.error("Still offline. Please check your network connection.");
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-950/60 backdrop-blur-md p-4">
      <div className="bg-white dark:bg-[#1a1d2e] border border-gray-200 dark:border-[#2d3052] rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center flex flex-col items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center animate-pulse">
          <WifiOff size={32} />
        </div>
        
        <div>
          <h2 className="text-lg font-black dark:text-[#f0f0f8] text-gray-900 mb-2">Connection Lost</h2>
          <p className="text-[12.5px] dark:text-[#a0a3b1] text-gray-500 leading-relaxed font-medium">
            You are currently offline. Please check your internet connection. StaySync will automatically reconnect when you're back online.
          </p>
        </div>

        <div className="w-full flex items-center justify-center gap-2 py-1.5 px-3 bg-gray-50 dark:bg-[#242740]/30 rounded-xl border border-gray-100 dark:border-[#2d3052]/30">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">Waiting for Network...</span>
        </div>

        <Button 
          variant="custom" 
          className="w-full font-bold text-[11px] uppercase tracking-wider h-10 rounded-xl bg-[#6c63ff]/10 hover:bg-[#6c63ff]/20 text-[#6c63ff] border border-[#6c63ff]/25 hover:border-[#6c63ff]/50 transition-all shadow-sm mt-1"
          onClick={handleRetry}
        >
          <RefreshCw size={14} className="mr-1" /> Check Again
        </Button>
      </div>
    </div>
  );
}

// ── 2. Route Error Fallback (handles ChunkLoadErrors and React Router exceptions) ──
export function RouteErrorFallback() {
  const error = useRouteError();
  console.error("RouteErrorFallback caught error:", error);

  const isChunkError = 
    error?.name === 'ChunkLoadError' || 
    error?.message?.toLowerCase().includes('loading chunk') ||
    error?.message?.toLowerCase().includes('dynamically imported');

  return (
    <ErrorFallbackView
      title={isChunkError ? 'Connection Interrupted' : 'Application Error'}
      subtitle={
        isChunkError 
          ? 'We had trouble fetching the page resource files. This usually happens when your internet connection drops during navigation.'
          : 'An unexpected rendering error occurred. Please try reloading the page.'
      }
      error={error}
      icon={isChunkError ? WifiOff : AlertTriangle}
      iconBgColor={isChunkError ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}
    />
  );
}

// ── 3. Global Error Boundary (standard React class boundary for render crashes) ─
export class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("GlobalErrorBoundary caught an uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallbackView
          title="Something went wrong"
          subtitle="An unexpected rendering error occurred in the application. Please try reloading the page."
          error={this.state.error}
        />
      );
    }

    return this.props.children;
  }
}
