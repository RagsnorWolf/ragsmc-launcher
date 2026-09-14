import { Component, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  errorInfo: string;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null, errorInfo: "" };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error("RagsMC fatal render error:", error, info);
    this.setState({ errorInfo: info?.componentStack ?? "" });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#0a0e0d",
            color: "#e8f0ec",
            padding: 32,
            overflow: "auto",
            fontFamily: "Consolas, monospace",
            fontSize: 14,
            zIndex: 99999,
          }}
        >
          <h1 style={{ color: "#f87171" }}>RagsMC Launcher encontró un error</h1>
          <p>Por favor reporta este mensaje para poder corregirlo:</p>
          <pre
            style={{
              background: "#131a18",
              border: "1px solid #3f3f46",
              borderRadius: 8,
              padding: 16,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {String(this.state.error?.message ?? this.state.error)}
            {this.state.error?.stack ? `\n\n${this.state.error.stack}` : ""}
            {this.state.errorInfo ? `\n\n${this.state.errorInfo}` : ""}
          </pre>
          <button
            onClick={this.handleReload}
            style={{
              marginTop: 16,
              padding: "10px 24px",
              background: "#10b981",
              color: "#0a0e0d",
              border: "none",
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
