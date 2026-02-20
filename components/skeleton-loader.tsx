export function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div className={`h-4 bg-gray-200 rounded animate-pulse ${className}`}></div>
  );
}

export function SkeletonSection() {
  return (
    <div className="space-y-2">
      <SkeletonLine className="w-3/4" />
      <SkeletonLine className="w-1/2" />
      <SkeletonLine className="w-5/6" />
    </div>
  );
}

export function SkeletonTable({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonLine key={i} className="w-full" />
      ))}
    </div>
  );
}
