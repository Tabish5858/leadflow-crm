import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function SkeletonChart() {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-[160px]" />
        <Skeleton className="h-4 w-[100px]" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  );
}

export function SkeletonChartGrid() {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
      <SkeletonChart />
      <SkeletonChart />
    </div>
  );
}
