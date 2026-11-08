export default function AdminDetailLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="skeleton h-4 w-32 mb-2" />
          <div className="skeleton h-8 w-56 mb-2" />
          <div className="skeleton h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <div className="skeleton h-10 w-28 rounded-xl" />
          <div className="skeleton h-10 w-28 rounded-xl" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5 space-y-4">
          <div className="skeleton h-6 w-40" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="skeleton h-4 w-32" />
              <div className="skeleton h-4 w-40" />
            </div>
          ))}
        </div>
        <div className="card p-5 space-y-4">
          <div className="skeleton h-6 w-40" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="skeleton h-4 w-32" />
              <div className="skeleton h-4 w-40" />
            </div>
          ))}
        </div>
      </div>
      <div className="card p-5 space-y-4">
        <div className="skeleton h-6 w-48" />
        <div className="skeleton h-24 w-full rounded-xl" />
        <div className="skeleton h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}
