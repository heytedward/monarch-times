import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center p-8">
          <div className="max-w-lg w-full border-8 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-8 bg-[#FF0000]">
            <h1 className="text-4xl font-black uppercase text-white mb-4 tracking-tighter">
              SYSTEM_ERROR
            </h1>
            <p className="text-white font-mono text-sm mb-6">
              An unexpected error occurred in the Monarch protocol.
            </p>
            <div className="bg-black text-white p-4 font-mono text-xs mb-6 overflow-auto max-h-32">
              {this.state.error?.message || 'Unknown error'}
            </div>
            <button
              onClick={this.handleReset}
              className="w-full bg-white text-black border-4 border-black p-4 font-black uppercase hover:bg-black hover:text-white transition-colors"
            >
              RETURN_TO_BASE
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
