import { Component } from "react";

export class UniformErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uniform Shop page render failed", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="container app-load-state">
          <h2>We couldn’t display this page</h2>
          <p className="status-message error">
            The Uniform Shop Manager encountered an unexpected display error.
          </p>
          <div className="form-actions">
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
