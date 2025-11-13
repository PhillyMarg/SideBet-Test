export default function BetCardSkeleton() {
  return (
    <li className="rounded-xl px-2 py-2 sm:px-4 sm:py-3 bg-zinc-900 border border-zinc-800 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-1 sm:mb-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-16 bg-zinc-800 rounded-full"></div>
          <div className="h-3 w-20 bg-zinc-800 rounded"></div>
        </div>
        <div className="h-3 w-12 bg-zinc-800 rounded"></div>
      </div>

      {/* Title */}
      <div className="h-4 w-3/4 bg-zinc-800 rounded mb-2"></div>

      {/* Stats */}
      <div className="flex justify-between mb-4">
        <div className="h-3 w-16 bg-zinc-800 rounded"></div>
        <div className="h-3 w-16 bg-zinc-800 rounded"></div>
        <div className="h-3 w-20 bg-zinc-800 rounded"></div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <div className="flex-1 h-12 bg-zinc-800 rounded-lg"></div>
        <div className="flex-1 h-12 bg-zinc-800 rounded-lg"></div>
      </div>
    </li>
  );
}