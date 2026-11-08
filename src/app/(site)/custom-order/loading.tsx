export default function CustomOrderLoading() {
  return (
    <div className="container-page py-8 animate-pulse">
      <div className="mb-7">
        <div className="mb-3 flex gap-1.5">
          <div className="skeleton h-3 w-12" />
          <div className="skeleton h-3 w-1" />
          <div className="skeleton h-3 w-24" />
        </div>
        <div className="skeleton h-9 w-72 mb-2" />
        <div className="skeleton h-4 w-96" />
      </div>
      <div className="grid gap-7 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <div className="card p-6 space-y-4">
            <div className="skeleton h-6 w-48" />
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-12 w-full rounded-xl" />
              ))}
            </div>
            <div className="skeleton h-24 w-full rounded-xl" />
            <div className="skeleton h-12 w-full rounded-xl" />
          </div>
          <div className="card p-6 space-y-4">
            <div className="skeleton h-6 w-40" />
            <div className="skeleton h-12 w-full rounded-xl" />
            <div className="skeleton h-12 w-full rounded-xl" />
          </div>
        </div>
        <aside className="card overflow-hidden">
          <div className="skeleton h-[420px] w-full" />
          <div className="space-y-2.5 px-5 py-4">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-8 w-full mt-3" />
          </div>
        </aside>
      </div>
    </div>
  );
}
