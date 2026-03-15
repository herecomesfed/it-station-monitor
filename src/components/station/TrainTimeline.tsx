import { cn } from "@/lib/utils";

export type TimelineStopStatus = "PASSED" | "ACTIVE" | "UPCOMING" | "STATIC";

export interface UnifiedStop {
  id: string;
  station: string;
  scheduledTime: string;
  actualTime?: string;
  delay: number;
  platform?: string | null;
  status: TimelineStopStatus;
}

interface TrainTimelineProps {
  stops: UnifiedStop[];
}

export default function TrainTimeline({ stops }: TrainTimelineProps) {
  return (
    <ul className="relative pl-4">
      {stops.map((s) => {
        const isPassed = s.status === "PASSED";
        const isActive = s.status === "ACTIVE";
        const isUpcoming = s.status === "UPCOMING";
        const isStatic = s.status === "STATIC";

        return (
          <li key={s.id}>
            <div className="flex gap-4">
              <div
                className={cn(
                  "relative flex w-6 items-center justify-center py-5",
                  "before:absolute before:left-1/2 before:top-0 before:h-full before:w-0.5 before:-translate-x-1/2 before:content-[''] before:bg-border",
                )}
              >
                <div
                  className={cn(
                    "relative z-10 rounded-full transition-all duration-300",
                    (isUpcoming || isStatic) && "h-2.5 w-2.5 bg-foreground",
                    isPassed && "h-2.5 w-2.5 bg-muted",
                    isActive && "h-3 w-3 bg-green-500 animate-pulse shadow-sm",
                  )}
                />
              </div>

              <div
                className={cn(
                  "py-3 flex flex-col justify-center w-full transition-opacity",
                  isPassed ? "opacity-50" : "opacity-100",
                )}
              >
                <div className="flex justify-between items-start">
                  <p
                    className={cn(
                      "font-bold leading-none mb-1",
                      isActive
                        ? "text-green-600 dark:text-green-400"
                        : "text-foreground",
                    )}
                  >
                    {s.station}
                  </p>

                  {s.platform && (
                    <span className="text-[9px] font-bold bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                      Bin {s.platform}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <p
                    className={cn(
                      "font-mono text-xs transition-colors",
                      isActive || s.delay > 0
                        ? "line-through text-muted-foreground/60"
                        : "text-muted-foreground",
                    )}
                  >
                    {s.scheduledTime}
                  </p>

                  {s.actualTime && (
                    <p
                      className={cn(
                        "font-mono text-xs font-bold",
                        s.delay > 5
                          ? "text-destructive"
                          : s.delay > 0
                            ? "text-orange-500"
                            : "text-green-600",
                      )}
                    >
                      {s.actualTime} {s.delay > 0 && `(+${s.delay}')`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
