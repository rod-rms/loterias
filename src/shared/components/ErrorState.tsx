export function ErrorState({ title, message }: { title: string; message: string }) {
  return (
    <div role="alert" className="border-l-2 border-rose-500 py-1 pl-3">
      <p className="font-semibold text-rose-200">{title}</p>
      <p className="mt-1 text-sm text-rose-300">{message}</p>
    </div>
  );
}
