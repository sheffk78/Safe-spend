import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0F172A",
            color: "#F1F5F9",
            fontFamily:
              'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
            padding: "2rem",
          }}
        >
          <div
            style={{
              maxWidth: "480px",
              width: "100%",
              textAlign: "center",
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: "64px",
                height: "64px",
                margin: "0 auto 1.5rem",
                borderRadius: "50%",
                backgroundColor: "rgba(16, 185, 129, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#10B981"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            {/* Heading */}
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                marginBottom: "0.75rem",
                color: "#10B981",
              }}
            >
              Something went wrong
            </h1>

            {/* Message */}
            <p
              style={{
                fontSize: "0.95rem",
                color: "#94A3B8",
                marginBottom: "1.5rem",
                lineHeight: 1.6,
              }}
            >
              An unexpected error occurred. You can try recovering by clicking
              the button below, or refresh the page.
            </p>

            {/* Error details (collapsible) */}
            {this.state.error && (
              <details
                style={{
                  marginBottom: "1.5rem",
                  textAlign: "left",
                  backgroundColor: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  borderRadius: "8px",
                  padding: "0.75rem 1rem",
                  fontSize: "0.8rem",
                  color: "#10B981",
                  cursor: "pointer",
                }}
              >
                <summary
                  style={{
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                    color: "#10B981",
                  }}
                >
                  Error details
                </summary>
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    margin: 0,
                    color: "#94A3B8",
                    fontSize: "0.75rem",
                  }}
                >
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            {/* Buttons */}
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={this.handleReset}
                style={{
                  padding: "0.625rem 1.5rem",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: "#0F172A",
                  backgroundColor: "#10B981",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "background-color 0.2s ease",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor = "#059669")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "#10B981")
                }
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: "0.625rem 1.5rem",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: "#10B981",
                  backgroundColor: "transparent",
                  border: "1px solid rgba(16, 185, 129, 0.4)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "background-color 0.2s ease",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    "rgba(16, 185, 129, 0.1)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;