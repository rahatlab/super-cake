export default function CakeDetailLoading() {
  return (
    <div className="container-page py-8 animate-pulse">
      <div className="mb-5 flex gap-1.5">
        <div className="skeleton h-3 w-12" />
        <div className="skeleton h-3 w-1" />
        <div className="skeleton h-3 w-16" />
        <div className="skeleton h-3 w-1" />
        <div className="skeleton h-3 w-24" />
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="skeleton aspect-square w-full !rounded-3xl" />
          <div className="mt-3 flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-16 w-16 !rounded-xl" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="skeleton h-6 w-20 rounded-full" />
            <div className="skeleton h-6 w-16 rounded-full" />
            <div className="skeleton h-6 w-24 rounded-full" />
          </div>
          <div className="skeleton h-10 w-3/4" />
          <div className="skeleton h-4 w-1/2" />
          <div className="skeleton h-4 w-24" />
          <div className="space-y-2">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-2/3" />
          </div>
          <div className="flex gap-2">
            <div className="skeleton h-9 w-24 rounded-full" />
            <div className="skeleton h-9 w-24 rounded-full" />
            <div className="skeleton h-9 w-24 rounded-full" />
          </div>
          <div className="card flex items-end justify-between gap-3 px-4 py-3.5">
            <div className="space-y-2">
              <div className="skeleton h-3 w-16" />
              <div className="skeleton h-8 w-24" />
            </div>
            <div className="space-y-2 text-right">
              <div className="skeleton h-3 w-16" />
              <div className="skeleton h-6 w-20" />
            </div>
          </div>
          <div className="skeleton h-12 w-full rounded-xl" />
          <div className="skeleton h-12 w-full rounded-xl" />
          <div className="skeleton h-11 w-full rounded-xl" />
        </div>
      </div>
      <div className="mt-16 grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="skeleton h-9 w-9 rounded-full" />
              <div className="space-y-2">
                <div className="skeleton h-4 w-28" />
                <div className="skeleton h-3 w-20" />
              </div>
            </div>
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
