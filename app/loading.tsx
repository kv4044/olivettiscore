function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-zinc-800/70 ${className}`} />
}

function MatchSkeleton({ index }: { index: number }) {
  return (
    <div
      className="border-b border-zinc-900/70 p-4 last:border-b-0"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <SkeletonLine className="h-5 w-14 shrink-0" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <SkeletonLine className="h-4 w-4 shrink-0 rounded-full" />
              <SkeletonLine className="h-4 w-44 max-w-[55%]" />
            </div>
            <div className="flex items-center gap-2">
              <SkeletonLine className="h-4 w-4 shrink-0 rounded-full" />
              <SkeletonLine className="h-4 w-36 max-w-[48%]" />
            </div>
          </div>
        </div>
        <SkeletonLine className="h-8 w-16 shrink-0" />
      </div>
    </div>
  )
}

export default function Loading() {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-zinc-950 to-black text-zinc-100">
      <main className="z-10 grid w-full grid-cols-1 gap-8 px-6 py-8 md:px-8 lg:grid-cols-12">
        <aside className="hidden space-y-4 lg:col-span-3 lg:block">
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/20 p-5">
            <SkeletonLine className="mb-3 h-4 w-28" />
            <SkeletonLine className="mb-2 h-3 w-full" />
            <SkeletonLine className="h-3 w-4/5" />
          </div>
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/20 p-4">
            <SkeletonLine className="mb-4 h-4 w-32" />
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="flex items-center gap-2">
                  <SkeletonLine className="h-4 w-4 rounded-full" />
                  <SkeletonLine className="h-3 flex-1" />
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="space-y-6 lg:col-span-9">
          <div className="flex flex-col gap-3 sm:flex-row">
            <SkeletonLine className="h-11 flex-1 rounded-2xl" />
            <SkeletonLine className="h-11 w-full rounded-2xl sm:w-44" />
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/20">
            <div className="border-b border-zinc-850 bg-zinc-900/50 px-4 py-3">
              <div className="flex items-center gap-3">
                <SkeletonLine className="h-6 w-6 rounded" />
                <div className="space-y-2">
                  <SkeletonLine className="h-4 w-40" />
                  <SkeletonLine className="h-3 w-24" />
                </div>
              </div>
            </div>
            {Array.from({ length: 6 }).map((_, index) => (
              <MatchSkeleton key={index} index={index} />
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
