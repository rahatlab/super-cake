export default function AdminFormLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div>
        <div className="skeleton h-8 w-48 mb-2" />
        <div className="skeleton h-4 w-80" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <div className="card p-5 space-y-4">
          <div className="skeleton h-6 w-40" />
          <div className="skeleton h-12 w-full rounded-xl" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="skeleton h-12 w-full rounded-xl" />
            <div className="skeleton h-12 w-full rounded-xl" />
            <div className="skeleton h-12 w-full rounded-xl" />
            <div className="skeleton h-12 w-full rounded-xl" />
          </div>
          <div className="skeleton h-12 w-full rounded-xl" />
          <div className="skeleton h-12 w-full rounded-xl" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-4 space-y-3">
              <div className="flex justify-between">
                <div className="skeleton h-5 w-32" />
                <div className="skeleton h-6 w-20 rounded-full" />
              </div>
              <div className="skeleton h-4 w-56" />
              <div className="skeleton h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
