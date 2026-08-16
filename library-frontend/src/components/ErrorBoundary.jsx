import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught error:', error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-rose-50 text-rose-800 rounded-lg">
          <h3 className="font-bold">Something went wrong rendering this form.</h3>
          <p className="text-sm mt-2">The error has been logged to the console for debugging.</p>
          <details className="mt-2 text-xs text-slate-600 whitespace-pre-wrap">
            {String(this.state.error)}
            {this.state.info && this.state.info.componentStack}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
