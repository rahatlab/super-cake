export default function AdminFormLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div>
        <div className="skeleton h-8 w-48 mb-2" />
        <div className="skeleton h-4 w-80" />
      </div>
      <div className="card p-5 space-y-4">
        <div className="skeleton h-6 w-40" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-12 w-full rounded-xl" />
          ))}
        </div>
        <div className="skeleton h-12 w-full rounded-xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5 space-y-4">
          <div className="skeleton h-6 w-40" />
          <div className="skeleton h-12 w-full rounded-xl" />
          <div className="skeleton h-12 w-full rounded-xl" />
        </div>
        <div className="card p-5 space-y-4">
          <div className="skeleton h-6 w-40" />
          <div className="skeleton h-12 w-full rounded-xl" />
          <div className="skeleton h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
