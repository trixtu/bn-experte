import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-5 w-80" />
        </div>

        <Skeleton className="h-16 w-full" />
      </div>
    </main>
  );
}
