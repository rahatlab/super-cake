export default function AccountLoading() {
  return (
    <div className="container-page py-10 animate-pulse">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="skeleton h-14 w-14 rounded-full" />
          <div className="space-y-2">
            <div className="skeleton h-6 w-40" />
            <div className="skeleton h-4 w-56" />
          </div>
        </div>
        <div className="skeleton h-10 w-28 rounded-xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3 mb-7">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-5 space-y-2">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton h-7 w-24" />
          </div>
        ))}
      </div>
      <div className="card p-6 space-y-4">
        <div className="skeleton h-6 w-40" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3 border-b border-line pb-3 last:border-0">
            <div className="space-y-2">
              <div className="skeleton h-4 w-36" />
              <div className="skeleton h-3 w-24" />
            </div>
            <div className="skeleton h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
