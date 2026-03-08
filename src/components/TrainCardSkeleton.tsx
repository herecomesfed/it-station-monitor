import { Card, CardContent } from "@/components/ui/card";

export default function TrainCardSkeleton() {
  return (
    <Card className="mb-3 overflow-hidden shadow-sm animate-pulse">
      <CardContent className="p-4">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <div className="flex flex-col gap-2">
              {/* Operator and number */}
              <div className="w-24 md:w-32 h-4 bg-muted rounded"></div>
              {/* Category */}
              <div className="w-16 h-2.5 bg-muted rounded"></div>
            </div>

            {/* Station Name */}
            <div className="flex items-end gap-1.5 mt-3">
              <div className="w-6 h-3 bg-muted rounded shrink-0 mb-1"></div>
              <div className="w-3/4 md:w-56 h-8 md:h-9 bg-muted rounded"></div>
            </div>
          </div>

          {/* Hour and delay */}
          <div className="text-right shrink-0 flex flex-col items-end">
            <div className="w-16 md:w-20 h-8 md:h-9 bg-muted rounded"></div>
            <div className="w-16 h-5 bg-muted rounded-full mt-2"></div>
          </div>
        </div>

        {/* Button and details */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <div className="flex flex-col">
            <div className="w-10 h-2 bg-muted rounded mb-1.5"></div>

            <div className="w-6 h-6 bg-muted rounded"></div>
          </div>

          <div className="w-20 h-8 bg-muted rounded-xl"></div>
        </div>
      </CardContent>
    </Card>
  );
}
