export default function SiteLoading() {
  return (
    <div className="container-page py-8 animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="mb-6">
        <div className="skeleton h-3 w-32 mb-3" />
        <div className="skeleton h-10 w-64 mb-2" />
        <div className="skeleton h-4 w-48" />
      </div>

      {/* Filter bar skeleton */}
      <div className="mb-6 flex gap-2">
        <div className="skeleton h-10 w-32" />
        <div className="skeleton h-10 w-32" />
        <div className="skeleton h-10 w-32" />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card overflow-hidden">
            <div className="skeleton aspect-square w-full" />
            <div className="p-4 space-y-3">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
              <div className="skeleton h-8 w-full mt-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
