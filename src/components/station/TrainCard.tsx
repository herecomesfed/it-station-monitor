import { useState } from "react";
import type { Train } from "../../types/types";
import { ChevronDown, Info } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import TrainTimelineSkeleton from "./TrainTimelineSkeleton";
import TrainTimeline, { type UnifiedStop } from "./TrainTimeline";
import { cn } from "@/lib/utils";
import { useTrainDetails } from "@/hooks/useTrainDetails";

export default function TrainCard({ train }: { train: Train }) {
  const [isOpen, setIsOpen] = useState(false);
  const isArrival = train.type === "ARRIVAL";

  const { realtimeData, isLoadingRealtime } = useTrainDetails(
    train.trainNumber,
    train.operator,
    isOpen,
  );

  const delayVal = parseInt(train.delay || "0");
  const hasDelay = delayVal > 0 && train.delay?.toLowerCase() !== "nessuno";

  const trainCategory =
    train.category && train.category !== "TRENO" ? train.category : "Treno";

  const formatTime = (ts: number | null) => {
    if (!ts) return "--:--";
    return new Date(ts).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /**
   * Unifies RFI static response and Viaggiatreno real time data
   */
  const getUnifiedStops = (): UnifiedStop[] => {
    // If real data exist, use them
    if (realtimeData && realtimeData.stops.length > 0) {
      return realtimeData.stops.map((s, i) => ({
        id: `${s.station}-${i}`,
        station: s.station,
        scheduledTime: formatTime(s.scheduledTime),
        actualTime:
          s.actualTime || s.delay > 0
            ? formatTime(s.actualTime || (s.scheduledTime ?? 0) + s.delay * 60000)
            : undefined,
        delay: s.delay,
        platform: s.actualPlatform,
        status: s.state,
      }));
    }

    // If there aren't real time data, use RFI fallback response
    if (train.nextStops && train.nextStops.length > 0) {
      return train.nextStops.map((s, i) => ({
        id: `${s.stop}-${i}`,
        station: s.stop,
        scheduledTime: s.hour,
        delay: 0,
        status: "STATIC",
      }));
    }

    return [];
  };

  const stopsToRender = getUnifiedStops();

  const renderTimelineContent = () => {
    if (isLoadingRealtime) {
      return <TrainTimelineSkeleton />;
    }

    if (stopsToRender.length > 0) {
      return (
        <div className="space-y-4">
          {/* Last Detection by Viaggiatreno */}
          {realtimeData?.lastDetectionStation && (
            <div className="bg-green-500/10 text-green-700 dark:text-green-400 p-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-center flex items-center justify-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Ultimo rilevamento: {realtimeData.lastDetectionStation}
            </div>
          )}

          {/* Fallback by RFI */}
          {!realtimeData && (
            <p className="text-[10px] text-muted-foreground italic text-center">
              Orari programmati da RFI
            </p>
          )}

          {/* Timeline */}
          <TrainTimeline stops={stopsToRender} />
        </div>
      );
    }

    // No data available
    return (
      <div className="bg-muted/50 p-4 rounded-xl text-center">
        <Info className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
        <p className="text-[10px] text-muted-foreground font-medium italic">
          Fermate non disponibili per questo treno.
        </p>
      </div>
    );
  };

  return (
    <Card className="mb-3 overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <div className="flex items-baseline gap-1 flex-col">
              <span className="text-sm md:text-base font-black text-foreground uppercase tracking-wide">
                {train.operator || "N.D."} {train.trainNumber}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                {trainCategory}
              </span>
            </div>

            <div className="flex items-baseline gap-1.5 leading-none mt-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest shrink-0">
                {isArrival ? "Da" : "Per"}
              </span>
              <h3 className="text-2xl md:text-3xl font-black text-foreground truncate">
                {train.station}
              </h3>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-2xl md:text-3xl font-black leading-none">
              {train.time}
            </div>
            <div className="mt-2">
              <Badge
                variant={hasDelay ? "destructive" : "outline"}
                className="text-[10px]"
              >
                {hasDelay ? `+${train.delay}' RITARDO` : "IN ORARIO"}
              </Badge>
            </div>
          </div>
        </div>

        <Collapsible
          open={isOpen}
          onOpenChange={setIsOpen}
          className="w-full mt-4 pt-3 border-t"
        >
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                Binario
              </span>
              <span className="text-lg md:text-xl font-black text-primary leading-none">
                {train.platform}
              </span>
            </div>

            <CollapsibleTrigger asChild>
              <Button
                variant={isOpen ? "default" : "secondary"}
                size="sm"
                className="h-8 text-xs font-bold rounded-xl"
              >
                {isOpen ? "Chiudi" : "Dettagli"}
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 ml-1.5 transition-transform duration-300",
                    isOpen && "rotate-180",
                  )}
                />
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent className="mt-4 pt-4 border-t border-dashed space-y-2">
            {renderTimelineContent()}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
