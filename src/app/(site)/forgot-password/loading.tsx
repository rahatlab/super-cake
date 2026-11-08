export default function AuthLoading() {
  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12 animate-pulse">
      <div className="w-full max-w-md">
        <div className="card p-7 space-y-4">
          <div className="skeleton h-8 w-48 mx-auto" />
          <div className="skeleton h-4 w-64 mx-auto" />
          <div className="skeleton h-12 w-full rounded-xl" />
          <div className="skeleton h-12 w-full rounded-xl" />
          <div className="skeleton h-4 w-40 mx-auto" />
        </div>
      </div>
    </div>
  );
}
