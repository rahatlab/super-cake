export default function AdminFormLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div>
        <div className="skeleton h-4 w-32 mb-2" />
        <div className="skeleton h-8 w-56 mb-2" />
        <div className="skeleton h-4 w-80" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5 space-y-4">
          <div className="skeleton h-6 w-32" />
          <div className="skeleton h-12 w-full rounded-xl" />
          <div className="skeleton h-24 w-full rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="skeleton h-12 w-full rounded-xl" />
            <div className="skeleton h-12 w-full rounded-xl" />
          </div>
          <div className="skeleton h-12 w-full rounded-xl" />
        </div>
        <div className="card p-5 space-y-4">
          <div className="skeleton h-6 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-12 w-full rounded-xl" />
          ))}
        </div>
        <div className="card p-5 space-y-4 lg:col-span-2">
          <div className="skeleton h-6 w-32" />
          <div className="flex gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-24 w-24 rounded-xl" />
            ))}
          </div>
          <div className="skeleton h-12 w-full rounded-xl" />
          <div className="skeleton h-20 w-full rounded-xl" />
        </div>
      </div>
      <div className="skeleton h-12 w-full rounded-xl" />
    </div>
  );
}
