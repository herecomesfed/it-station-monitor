import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackSubtitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Error Boundary component that catches runtime errors in its children
 * and displays a fallback UI with a retry button.
 *
 * Must be a class component because React only supports error boundaries
 * via componentDidCatch / getDerivedStateFromError (no hooks equivalent).
 */
export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 min-h-[300px]">
          <AlertTriangle className="w-10 h-10 text-destructive mb-4" />
          <h3 className="text-lg font-bold text-foreground mb-1">
            {this.props.fallbackTitle || "Qualcosa è andato storto"}
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            {this.props.fallbackSubtitle ||
              "Si è verificato un errore imprevisto. Riprova."}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={this.handleRetry}
            className="font-bold rounded-xl"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Riprova
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
