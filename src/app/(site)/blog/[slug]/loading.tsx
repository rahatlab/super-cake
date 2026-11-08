export default function BlogPostLoading() {
  return (
    <div className="container-page py-10 animate-pulse">
      <div className="mx-auto max-w-3xl">
        <div className="mb-3 flex gap-1.5">
          <div className="skeleton h-3 w-12" />
          <div className="skeleton h-3 w-1" />
          <div className="skeleton h-3 w-16" />
          <div className="skeleton h-3 w-1" />
          <div className="skeleton h-3 w-24" />
        </div>
        <div className="skeleton h-10 w-full mb-3" />
        <div className="skeleton h-10 w-2/3 mb-4" />
        <div className="flex items-center gap-3 mb-6">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-4 w-4 rounded-full" />
          <div className="skeleton h-4 w-20" />
        </div>
        <div className="skeleton aspect-[16/8] w-full rounded-2xl mb-8" />
        <div className="space-y-3">
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-1/2" />
          <div className="skeleton h-6 w-48 mt-6" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}
