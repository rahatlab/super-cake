export default function SiteLoading() {
  return (
    <div className="min-h-screen animate-pulse">
      {/* Hero section skeleton */}
      <div className="relative bg-gradient-to-b from-brand/5 to-transparent py-12 sm:py-16">
        <div className="container-page">
          <div className="mx-auto max-w-3xl text-center">
            <div className="skeleton h-4 w-24 mx-auto mb-4 rounded-full" />
            <div className="skeleton h-10 w-3/4 mx-auto mb-3" />
            <div className="skeleton h-6 w-1/2 mx-auto mb-6" />
            <div className="flex justify-center gap-3">
              <div className="skeleton h-12 w-36 rounded-xl" />
              <div className="skeleton h-12 w-36 rounded-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Search/Chip skeleton */}
      <div className="container-page py-6">
        <div className="flex flex-wrap justify-center gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-9 w-24 rounded-full" />
          ))}
        </div>
      </div>

      {/* Featured cakes skeleton */}
      <div className="container-page py-12">
        <div className="skeleton h-8 w-48 mb-7" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="skeleton aspect-square w-full" />
              <div className="p-4 space-y-3">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
                <div className="skeleton h-8 w-full mt-3" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works skeleton */}
      <div className="border-y border-line bg-surface py-14">
        <div className="container-page">
          <div className="skeleton h-8 w-48 mx-auto mb-4" />
          <div className="skeleton h-5 w-64 mx-auto mb-10" />
          <div className="grid gap-5 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-6">
                <div className="skeleton h-11 w-11 rounded-xl mb-4" />
                <div className="skeleton h-5 w-3/4 mb-2" />
                <div className="skeleton h-4 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features skeleton */}
      <div className="container-page py-14">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5">
              <div className="skeleton h-10 w-10 rounded-xl mb-3" />
              <div className="skeleton h-5 w-3/4 mb-2" />
              <div className="skeleton h-4 w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Custom order CTA skeleton */}
      <div className="container-page pb-6">
        <div className="card !border-brand/25 bg-gradient-to-br from-brand/12 via-transparent to-accent/12 p-7 sm:p-10">
          <div className="skeleton h-7 w-40 mb-4" />
          <div className="skeleton h-8 w-3/4 mb-3" />
          <div className="skeleton h-4 w-full mb-2" />
          <div className="skeleton h-4 w-2/3 mb-6" />
          <div className="flex gap-3">
            <div className="skeleton h-11 w-44 rounded-xl" />
            <div className="skeleton h-11 w-44 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}