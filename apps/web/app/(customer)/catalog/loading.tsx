export default function CatalogLoading() {
  return (
    <div className="min-h-screen bg-canvas">
      {/* Header skeleton */}
      <div className="border-b border-bdr bg-white px-4 py-8 sm:px-6">
        <div className="container-gc-w mx-auto space-y-4">
          <div className="h-10 w-48 bg-gray-200 rounded-md animate-pulse" />
          <div className="h-6 w-96 bg-gray-100 rounded-md animate-pulse" />
        </div>
      </div>

      <div className="container-gc-w mx-auto flex gap-6 px-4 py-8 sm:px-6">
        {/* Sidebar skeleton */}
        <div className="hidden w-48 flex-shrink-0 space-y-4 md:block">
          <div className="h-8 w-full bg-gray-200 rounded-md animate-pulse" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 w-full bg-gray-100 rounded-md animate-pulse" />
            ))}
          </div>
        </div>

        {/* Grid skeleton */}
        <div className="flex-1">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-square rounded-md border-2 border-bdr bg-gray-200 animate-pulse" />
                <div className="h-4 w-3/4 bg-gray-100 rounded-md animate-pulse" />
                <div className="h-6 w-1/2 bg-gray-100 rounded-md animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
