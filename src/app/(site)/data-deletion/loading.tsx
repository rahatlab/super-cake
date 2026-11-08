export default function LegalLoading() {
  return (
    <div className="container-page py-10 animate-pulse">
      <div className="mx-auto max-w-3xl">
        <div className="skeleton h-6 w-32 rounded-full mb-4" />
        <div className="skeleton h-9 w-3/4 mb-3" />
        <div className="skeleton h-4 w-1/2 mb-2" />
        <div className="skeleton h-3 w-40 mb-8" />
        <div className="space-y-3">
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-2/3" />
          <div className="skeleton h-6 w-48 mt-6" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-1/2" />
        </div>
      </div>
    </div>
  );
}
