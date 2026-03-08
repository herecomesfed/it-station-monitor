import { useState } from "react";
import type { Train } from "../types/types";
import { ChevronDown, Info } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function TrainCard({ train }: { train: Train }) {
  const [isOpen, setIsOpen] = useState(false);
  const isArrival = train.type === "ARRIVAL";

  const delayVal = parseInt(train.delay || "0");
  const hasDelay = delayVal > 0 && train.delay?.toLowerCase() !== "nessuno";

  const trainCategory =
    train.category && train.category !== "TRENO" ? train.category : "Treno";

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
                  className={`w-3.5 h-3.5 ml-1.5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                />
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent className="mt-4 pt-4 border-t border-dashed space-y-2">
            {train.nextStops.length > 0 ? (
              <ul className="relative pl-4">
                {train.nextStops.map((s, i) => (
                  <li key={s.stop}>
                    <div className="flex gap-4">
                      <div className="relative flex w-6 items-center justify-center py-5 before:absolute before:left-1/2 before:top-0 before:h-full before:w-0.5 before:-translate-x-1/2 before:bg-foreground before:content-['']">
                        <div className="relative z-10 h-2.5 w-2.5 rounded-full bg-foreground"></div>
                      </div>

                      <div className="py-3 flex flex-col justify-center">
                        <p className="font-bold text-foreground leading-none mb-1">
                          {s.stop}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {s.hour}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="bg-muted/50 p-4 rounded-xl text-center">
                <Info className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground font-medium italic">
                  Fermate non disponibili per questo treno.
                </p>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
