export default function CakesLoading() {
  return (
    <div className="container-page py-8">
      {/* Header skeleton */}
      <header className="mb-6 animate-pulse">
        <nav className="mb-3 flex gap-1.5">
          <div className="skeleton h-3 w-12" />
          <div className="skeleton h-3 w-1" />
          <div className="skeleton h-3 w-16" />
        </nav>
        <div className="skeleton h-9 w-64 mb-2" />
        <div className="skeleton h-4 w-48" />
      </header>

      {/* Filters skeleton */}
      <div className="mb-6 animate-pulse">
        <div className="skeleton h-24 w-full rounded-2xl" />
      </div>

      {/* Cakes grid skeleton */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="card overflow-hidden animate-pulse">
            {/* Image skeleton */}
            <div className="skeleton aspect-square w-full" />

            {/* Content skeleton */}
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="skeleton h-5 w-5 rounded-full" />
                <div className="skeleton h-3 w-12" />
              </div>
              <div className="skeleton h-5 w-full" />
              <div className="skeleton h-4 w-2/3" />
              <div className="flex items-center justify-between pt-2">
                <div className="skeleton h-6 w-20" />
                <div className="skeleton h-9 w-9 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SEO section skeleton */}
      <div className="mt-14 animate-pulse">
        <div className="skeleton h-64 w-full rounded-2xl" />
      </div>
    </div>
  );
}
