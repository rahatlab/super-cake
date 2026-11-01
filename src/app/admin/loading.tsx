export default function AdminLoading() {
  return (
    <div className="p-6 animate-pulse">
      {/* Page header skeleton */}
      <div className="mb-6">
        <div className="skeleton h-8 w-48 mb-2" />
        <div className="skeleton h-4 w-64" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5">
            <div className="skeleton h-4 w-24 mb-3" />
            <div className="skeleton h-8 w-20 mb-2" />
            <div className="skeleton h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Table or content skeleton */}
      <div className="card p-6">
        <div className="skeleton h-10 w-full mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
