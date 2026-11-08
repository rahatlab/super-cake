export default function AdminFormLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div>
        <div className="skeleton h-4 w-32 mb-2" />
        <div className="skeleton h-8 w-56 mb-2" />
        <div className="skeleton h-4 w-80" />
      </div>
      <div className="card p-5 space-y-4">
        <div className="skeleton h-12 w-full rounded-xl" />
        <div className="skeleton h-12 w-full rounded-xl" />
        <div className="skeleton h-24 w-full rounded-xl" />
        <div className="skeleton h-12 w-full rounded-xl" />
        <div className="skeleton h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}
