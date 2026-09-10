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
      <div role="alert" className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-xl font-bold text-slate-900">Algo deu errado</h1>
        <p className="text-sm text-slate-600">Não foi possível carregar esta tela. Seus jogos salvos continuam armazenados neste navegador.</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={this.handleRetry} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Tentar novamente
          </button>
          <a href="/" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800">
            Voltar ao início
          </a>
        </div>
      </div>
    );
  }
}
