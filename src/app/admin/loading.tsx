export default function AdminOverviewLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="skeleton h-8 w-40 mb-2" />
          <div className="skeleton h-4 w-72" />
        </div>
        <div className="skeleton h-9 w-28 rounded-xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="skeleton h-3 w-20" />
                <div className="skeleton h-7 w-16" />
                <div className="skeleton h-3 w-28" />
              </div>
              <div className="skeleton h-10 w-10 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-5">
            <div className="skeleton h-4 w-40 mb-4" />
            <div className="skeleton h-48 w-full rounded-xl" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <div className="card p-5">
          <div className="skeleton h-4 w-40 mb-4" />
          <div className="skeleton h-48 w-full rounded-xl" />
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="card overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <div className="skeleton h-4 w-32" />
            </div>
            <div className="space-y-3 px-5 py-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className="skeleton h-9 w-9 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-32" />
                    <div className="skeleton h-3 w-40" />
                  </div>
                  <div className="skeleton h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
