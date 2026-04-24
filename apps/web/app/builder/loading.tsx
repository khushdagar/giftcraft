export default function BuilderLoading() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-4 border-em/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-em animate-spin" />
        </div>
        <p className="text-ink-2 text-sm">Loading builder...</p>
      </div>
    </div>
  );
}
