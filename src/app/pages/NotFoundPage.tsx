import { Link } from "react-router-dom";

export function NotFoundPage({ message }: { message?: string }) {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
      <p className="text-ink-200">{message ?? "O endereço não corresponde a nenhuma página ou modalidade deste aplicativo."}</p>
      <Link to="/" className="text-sm font-medium text-ink-100 underline underline-offset-2">
        Ir para o início
      </Link>
    </div>
  );
}
