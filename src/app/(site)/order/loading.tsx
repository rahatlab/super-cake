export default function OrderLoading() {
  return (
    <div className="container-page py-8 animate-pulse">
      <div className="mb-7">
        <div className="mb-3 flex gap-1.5">
          <div className="skeleton h-3 w-12" />
          <div className="skeleton h-3 w-1" />
          <div className="skeleton h-3 w-16" />
        </div>
        <div className="skeleton h-9 w-72 mb-2" />
        <div className="skeleton h-4 w-96" />
      </div>
      <div className="grid gap-7 lg:grid-cols-[1.55fr_1fr]">
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-1 items-center gap-2 last:flex-none">
                <div className="skeleton h-8 w-8 rounded-full" />
                <div className="skeleton h-3 w-16 hidden sm:block" />
                {i < 3 && <div className="skeleton h-0.5 flex-1" />}
              </div>
            ))}
          </div>
          <div className="card p-6 space-y-4">
            <div className="skeleton h-6 w-48" />
            <div className="skeleton h-4 w-72" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-24 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
        <aside className="card overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <div className="skeleton h-5 w-32 mb-2" />
            <div className="skeleton h-3 w-20" />
          </div>
          <div className="space-y-3 px-5 py-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="space-y-2">
                  <div className="skeleton h-4 w-32" />
                  <div className="skeleton h-3 w-20" />
                </div>
                <div className="skeleton h-4 w-16" />
              </div>
            ))}
          </div>
          <div className="space-y-2.5 border-t border-line px-5 py-4">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-8 w-full mt-3" />
          </div>
        </aside>
      </div>
    </div>
  );
}
