export default function PaymentCallbackLoading() {
  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center py-16 animate-pulse">
      <div className="card mx-auto max-w-md p-8 text-center space-y-4">
        <div className="skeleton h-14 w-14 rounded-full mx-auto" />
        <div className="skeleton h-7 w-48 mx-auto" />
        <div className="skeleton h-4 w-64 mx-auto" />
        <div className="skeleton h-4 w-56 mx-auto" />
        <div className="skeleton h-11 w-40 rounded-xl mx-auto" />
      </div>
    </div>
  );
}
