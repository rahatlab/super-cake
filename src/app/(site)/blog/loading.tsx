export default function BlogLoading() {
  return (
    <div className="container-page py-10 animate-pulse">
      <div className="mb-8">
        <div className="mb-3 flex gap-1.5">
          <div className="skeleton h-3 w-12" />
          <div className="skeleton h-3 w-1" />
          <div className="skeleton h-3 w-16" />
        </div>
        <div className="skeleton h-9 w-56 mb-2" />
        <div className="skeleton h-4 w-80" />
      </div>
      <div className="card overflow-hidden mb-8">
        <div className="skeleton aspect-[16/7] w-full" />
        <div className="p-6 space-y-3">
          <div className="skeleton h-7 w-3/4" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-2/3" />
          <div className="skeleton h-3 w-32" />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card overflow-hidden">
            <div className="skeleton aspect-[16/9] w-full" />
            <div className="p-5 space-y-3">
              <div className="skeleton h-5 w-full" />
              <div className="skeleton h-4 w-2/3" />
              <div className="skeleton h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
