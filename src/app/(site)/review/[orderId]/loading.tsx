export default function ReviewLoading() {
  return (
    <div className="container-page py-10 animate-pulse">
      <div className="mx-auto max-w-2xl">
        <div className="card p-7 space-y-4">
          <div className="skeleton h-7 w-56 mx-auto" />
          <div className="skeleton h-4 w-72 mx-auto" />
          <div className="flex justify-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-10 w-10 rounded-full" />
            ))}
          </div>
          <div className="skeleton h-12 w-full rounded-xl" />
          <div className="skeleton h-24 w-full rounded-xl" />
          <div className="skeleton h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
