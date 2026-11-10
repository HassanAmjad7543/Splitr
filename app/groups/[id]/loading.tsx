import { Skeleton } from "@/components/ui/skeleton";

export default function GroupLoading() {
  return (
    <>
      <div className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Skeleton className="size-8" />
          <Skeleton className="h-6 w-48" />
        </div>
      </div>
      <main className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4 lg:order-2">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
        </div>
        <div className="grid content-start gap-3 lg:order-1">
          <Skeleton className="h-7 w-32" />
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </main>
    </>
  );
}
