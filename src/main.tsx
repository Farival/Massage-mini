import React, { StrictMode, Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[App] ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#111b21',
          color: '#e9edef',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          textAlign: 'center',
        }}>
          <div style={{
            maxWidth: '420px',
            width: '100%',
            backgroundColor: '#202c33',
            padding: '28px',
            borderRadius: '16px',
            border: '1px solid #374248',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px', color: '#00a884' }}>
              ChatID Messenger
            </h2>
            <p style={{ fontSize: '13px', color: '#8696a0', marginBottom: '18px', lineHeight: '1.5' }}>
              Menyesuaikan komponen tampilan pada peramban ini...
            </p>
            {this.state.error?.message && (
              <div style={{
                fontSize: '11px',
                color: '#f87171',
                backgroundColor: '#111b21',
                padding: '12px',
                borderRadius: '8px',
                wordBreak: 'break-all',
                marginBottom: '18px',
                fontFamily: 'monospace',
                textAlign: 'left',
              }}>
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={() => {
                localStorage.removeItem('chat_current_user');
                window.location.reload();
              }}
              style={{
                backgroundColor: '#00a884',
                color: '#111b21',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
                width: '100%',
              }}
            >
              Muat Ulang Aplikasi
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
