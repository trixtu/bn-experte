import { Skeleton } from "@/components/ui/skeleton";

export default function MainLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 sm:py-8 lg:py-10">
      <div className="space-y-4 sm:space-y-5">
        <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <Skeleton className="size-10 shrink-0 rounded-lg sm:size-11" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-6 w-36 sm:h-7 sm:w-40" />
                <Skeleton className="h-4 w-full max-w-56 sm:max-w-64" />
              </div>
            </div>
            <Skeleton className="h-9 w-full rounded-md sm:h-10 sm:w-36" />
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
          <Skeleton className="h-24 rounded-lg sm:h-28" />
          <Skeleton className="h-24 rounded-lg sm:h-28" />
          <Skeleton className="hidden h-28 rounded-lg md:block" />
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
          <div className="rounded-lg border bg-card p-4 shadow-sm sm:p-5">
            <div className="space-y-3 sm:space-y-4">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-9 w-full rounded-md sm:h-10" />
              <Skeleton className="h-14 w-full rounded-md sm:h-16" />
              <Skeleton className="h-14 w-full rounded-md sm:h-16" />
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4 shadow-sm sm:p-5">
            <div className="space-y-3 sm:space-y-4">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-4 w-full max-w-72" />
              <Skeleton className="h-40 w-full rounded-md sm:h-52" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
