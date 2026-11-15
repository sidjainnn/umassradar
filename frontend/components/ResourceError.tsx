export function ResourceError({ message, retry }: { message: string; retry?: () => void }) {
  return <div role="alert" className="rounded-2xl border border-maroon-200 bg-maroon-50 p-4 text-sm text-maroon-800">
    <p>{message}</p>{retry && <button onClick={retry} className="mt-2 font-semibold underline">Try again</button>}
  </div>;
}
