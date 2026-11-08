export default function OrderSuccessLoading() {
  return (
    <div className="container-page py-16 animate-pulse">
      <div className="card mx-auto max-w-lg p-8 text-center space-y-4">
        <div className="skeleton h-16 w-16 rounded-full mx-auto" />
        <div className="skeleton h-7 w-56 mx-auto" />
        <div className="skeleton h-4 w-72 mx-auto" />
        <div className="skeleton h-4 w-64 mx-auto" />
        <div className="flex justify-center gap-3 pt-2">
          <div className="skeleton h-11 w-32 rounded-xl" />
          <div className="skeleton h-11 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
