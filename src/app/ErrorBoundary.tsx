import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Top-level, class-based React Error Boundary wrapping the whole router
 * tree. A render/lifecycle exception anywhere in a page must never leave
 * the user with an unexplained blank screen — it shows a calm fallback
 * instead, with no stack trace exposed to lay users. Local IndexedDB data
 * is untouched by a render crash, so the fallback says so explicitly.
 *
 * "Voltar ao início" is a plain `<a>` (full navigation), not a router
 * `<Link>`, so it still works even if the crash happened inside the
 * router tree itself.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("Unhandled UI error caught by ErrorBoundary:", error, info.componentStack);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg text-brand-text">
        <div role="alert" className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="text-xl font-bold text-brand-text">Algo deu errado</h1>
          <p className="text-sm text-brand-textMuted">Não foi possível carregar esta tela. Seus jogos salvos continuam armazenados neste navegador.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={this.handleRetry} className="rounded-md bg-brand-action px-4 py-2 text-sm font-semibold text-brand-actionForeground">
              Tentar novamente
            </button>
            <a href="/" className="rounded-md border border-brand-border px-4 py-2 text-sm font-semibold text-brand-text">
              Voltar ao início
            </a>
          </div>
        </div>
      </div>
    );
  }
}
