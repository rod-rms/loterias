export function ErrorState({ title, message }: { title: string; message: string }) {
  return (
    <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-4">
      <p className="font-semibold text-rose-800">{title}</p>
      <p className="mt-1 text-sm text-rose-700">{message}</p>
    </div>
  );
}
