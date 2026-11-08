export default function AdminListLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="skeleton h-8 w-48 mb-2" />
          <div className="skeleton h-4 w-80" />
        </div>
        <div className="skeleton h-10 w-32 rounded-xl" />
      </div>
      <div className="card overflow-hidden">
        <div className="divide-y divide-line">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <div className="skeleton h-10 w-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-40" />
                <div className="skeleton h-3 w-56" />
              </div>
              <div className="skeleton h-6 w-20 rounded-full" />
              <div className="skeleton h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
