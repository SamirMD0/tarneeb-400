'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback component */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Page-level error boundary.
 *
 * Catches render-time exceptions in any child tree and displays a
 * user-friendly recovery UI instead of a blank white screen.
 * The socket connection and AppProvider remain intact above this
 * boundary, so the user can navigate back without a full page reload.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/lobby';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          id="error-boundary-fallback"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            fontFamily:
              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            color: '#fafafa',
            textAlign: 'center',
          }}
        >
          {/* Glow ring */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              border: '2px solid rgba(167, 139, 250, 0.4)',
              boxShadow: '0 0 40px rgba(167, 139, 250, 0.15), inset 0 0 20px rgba(167, 139, 250, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem',
            }}
          >
            <span style={{ fontSize: 32, lineHeight: 1 }}>⚠️</span>
          </div>

          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              margin: '0 0 0.5rem',
              letterSpacing: '-0.01em',
            }}
          >
            Something went wrong
          </h1>

          <p
            style={{
              fontSize: '0.925rem',
              color: 'rgba(250, 250, 250, 0.55)',
              maxWidth: 420,
              margin: '0 0 2rem',
              lineHeight: 1.5,
            }}
          >
            An unexpected error occurred. You can try again or return to the
            lobby.
          </p>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              id="error-boundary-retry"
              onClick={this.handleReset}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '0.5rem',
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.06)',
                color: '#fafafa',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.background =
                  'rgba(255,255,255,0.10)';
                (e.target as HTMLButtonElement).style.borderColor =
                  'rgba(255,255,255,0.2)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.background =
                  'rgba(255,255,255,0.06)';
                (e.target as HTMLButtonElement).style.borderColor =
                  'rgba(255,255,255,0.12)';
              }}
            >
              Try Again
            </button>

            <button
              id="error-boundary-lobby"
              onClick={this.handleGoHome}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                color: '#fafafa',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(124, 58, 237, 0.25)',
                transition: 'opacity 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.opacity = '0.9';
                (e.target as HTMLButtonElement).style.boxShadow =
                  '0 0 30px rgba(124, 58, 237, 0.4)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.opacity = '1';
                (e.target as HTMLButtonElement).style.boxShadow =
                  '0 0 20px rgba(124, 58, 237, 0.25)';
              }}
            >
              Return to Lobby
            </button>
          </div>

          {/* Error detail (dev only) */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre
              style={{
                marginTop: '2rem',
                padding: '1rem',
                borderRadius: '0.5rem',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(250,250,250,0.45)',
                fontSize: '0.75rem',
                maxWidth: 520,
                overflow: 'auto',
                textAlign: 'left',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {this.state.error.message}
              {'\n'}
              {this.state.error.stack}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
