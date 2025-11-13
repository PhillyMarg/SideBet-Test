export default function GroupCardSkeleton() {
  return (
    <li className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="h-5 w-32 bg-zinc-800 rounded"></div>
        <div className="h-4 w-16 bg-zinc-800 rounded"></div>
      </div>

      {/* Description */}
      <div className="h-3 w-full bg-zinc-800 rounded mb-2"></div>
      <div className="h-3 w-2/3 bg-zinc-800 rounded mb-3"></div>

      {/* Stats */}
      <div className="flex justify-between text-sm">
        <div className="h-3 w-24 bg-zinc-800 rounded"></div>
        <div className="h-3 w-20 bg-zinc-800 rounded"></div>
      </div>
    </li>
  );
}