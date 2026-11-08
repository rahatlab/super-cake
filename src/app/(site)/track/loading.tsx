export default function TrackLoading() {
  return (
    <div className="container-page py-10 animate-pulse">
      <div className="mx-auto mb-8 max-w-3xl text-center">
        <div className="skeleton h-6 w-32 rounded-full mx-auto mb-4" />
        <div className="skeleton h-9 w-80 mx-auto mb-3" />
        <div className="skeleton h-4 w-96 mx-auto" />
      </div>
      <div className="mx-auto max-w-3xl">
        <div className="card p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="skeleton h-12 w-full rounded-xl" />
            <div className="skeleton h-12 w-full rounded-xl" />
          </div>
          <div className="skeleton h-12 w-full rounded-xl" />
        </div>
        <div className="card mt-5 p-6 space-y-4">
          <div className="skeleton h-6 w-48" />
          <div className="flex items-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-1 items-center gap-2 last:flex-none">
                <div className="skeleton h-8 w-8 rounded-full" />
                {i < 4 && <div className="skeleton h-0.5 flex-1" />}
              </div>
            ))}
          </div>
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}
