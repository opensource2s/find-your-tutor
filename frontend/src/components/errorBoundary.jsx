import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Tutorly UI error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="page-loader" role="alert">
          <div>
            <b>Something went wrong while rendering this page.</b>
            <p>{this.state.error.message}</p>
            <button onClick={() => window.location.reload()}>Reload page</button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
