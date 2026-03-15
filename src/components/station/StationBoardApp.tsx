import { useEffect, useState } from "react";
import StationBoard from "./StationBoard";
import { Search, X } from "lucide-react";
import ErrorBoundary from "../common/ErrorBoundary";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ARRIVALS = "ARRIVALS";
const DEPARTURES = "DEPARTURES";

type tabType = typeof ARRIVALS | typeof DEPARTURES;

export default function StationBoardApp({
  placeId,
  stationName,
}: {
  placeId: string;
  stationName: string;
}) {
  const [type, setType] = useState<tabType>(DEPARTURES);
  const [searchQuery, setSearchQuery] = useState("");

  /**
   * Effect to define if we are looking for arrivals or departures
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    setType(tab === ARRIVALS ? ARRIVALS : DEPARTURES);
  }, []);

  /**
   * This function listen the tab change
   * @param val the value of the tab
   */
  const handleTabChange = (val: string) => {
    const newType = val as tabType;
    setType(newType);
    setSearchQuery("");

    const url = new URL(window.location.href);
    url.searchParams.set("tab", newType === ARRIVALS ? ARRIVALS : DEPARTURES);
    window.history.replaceState({}, "", url.toString());
  };

  return (
    <div className="min-h-screen pb-10 bg-background">
      <main className="flex flex-col min-h-screen max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col gap-1 pt-3">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            Tabellone di
          </span>
          <h2 className="text-3xl md:text-4xl capitalize font-black leading-none text-foreground">
            {stationName}
          </h2>
        </div>

        <Tabs
          value={type}
          onValueChange={handleTabChange}
          className="w-full relative z-10"
        >
          <TabsList className="grid w-full grid-cols-2 h-12 rounded-xl">
            <TabsTrigger
              value={DEPARTURES}
              className="text-xs font-black uppercase rounded-lg"
            >
              Partenze
            </TabsTrigger>
            <TabsTrigger
              value={ARRIVALS}
              className="text-xs font-black uppercase rounded-lg"
            >
              Arrivi
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cerca un treno..."
              className="w-full pl-10 pr-10 py-3 bg-card border border-border rounded-xl shadow-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-sm font-medium text-foreground placeholder:text-muted-foreground/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Cerca treni"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <span className="text-xs text-muted-foreground/60 px-2">
            Puoi cercare per numero, categoria, operatore o stazione.
          </span>
        </div>

        <ErrorBoundary>
          <StationBoard
            key={`${placeId}-${type}`}
            placeId={placeId}
            isArrivals={type === ARRIVALS}
            searchQuery={searchQuery}
          />
        </ErrorBoundary>
      </main>
    </div>
  );
}
