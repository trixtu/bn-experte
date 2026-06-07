import { Skeleton } from "@/components/ui/skeleton";

export default function MainLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:py-10">
      <div className="space-y-5">
        <section className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="size-11 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-4 w-64 max-w-full" />
              </div>
            </div>
            <Skeleton className="h-10 w-36 rounded-md" />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="space-y-4">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-16 w-full rounded-md" />
              <Skeleton className="h-16 w-full rounded-md" />
            </div>
          </div>

          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="space-y-4">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-4 w-72 max-w-full" />
              <Skeleton className="h-52 w-full rounded-md" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
