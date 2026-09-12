export function ErrorState({ title, message }: { title: string; message: string }) {
  return (
    <div role="alert" className="rounded-xl border border-rose-700 bg-rose-950/40 p-4">
      <p className="font-semibold text-rose-200">{title}</p>
      <p className="mt-1 text-sm text-rose-300">{message}</p>
    </div>
  );
}
