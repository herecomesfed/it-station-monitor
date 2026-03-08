import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import type { ResponseDto, BoardData } from "../types/types";
import TrainCard from "./TrainCard";
import TrainCardSkeleton from "./TrainCardSkeleton";
import { AlertTriangle, TrainIcon } from "lucide-react";
import EmptyBox from "./EmptyBox";
import TurnstileWidget from "./TurnstileWidget";

const stationCache = new Map<string, BoardData>();

export default function StationBoard({
  placeId,
  isArrivals,
  searchQuery,
}: {
  placeId: string;
  isArrivals: boolean;
  searchQuery: string;
}) {
  // Local cache to avoid useless api call
  const cacheKey = `${placeId}-${isArrivals ? "ARR" : "DEP"}`;

  // Get cached data in memory
  const [data, setData] = useState<BoardData | null>(
    stationCache.get(cacheKey) || null,
  );
  const [isLoading, setIsLoading] = useState(!stationCache.has(cacheKey));
  const [error, setError] = useState<string | null>(null);

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [widgetKey, setWidgetKey] = useState(0);

  const lastFetchTime = useRef<number>(0);

  const handleTurnstileSuccess = useCallback((token: string) => {
    setTurnstileToken((prev) => (prev ? prev : token));
  }, []);

  useEffect(() => {
    // If there are cached data, show them
    if (stationCache.has(cacheKey)) {
      setData(stationCache.get(cacheKey)!);
      setIsLoading(false);
    } else {
      setData(null);
      setIsLoading(true);
    }

    // obtain new token
    setTurnstileToken(null);
    setWidgetKey((prev) => prev + 1);

    const triggerRefresh = () => {
      const now = Date.now();
      if (now - lastFetchTime.current >= 50000) {
        setTurnstileToken(null);
        setWidgetKey((prev) => prev + 1);
      }
    };

    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") triggerRefresh();
    }, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") triggerRefresh();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [placeId, isArrivals, cacheKey]);

  useEffect(() => {
    if (!turnstileToken) return;

    const fetchBoardData = async () => {
      lastFetchTime.current = Date.now();

      try {
        const endpoint = `/api/monitor?placeId=${placeId}&arrivals=${isArrivals}`;
        const res = await fetch(endpoint, {
          headers: {
            "X-Turnstile-Token": turnstileToken,
          },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          setError(errData.error || "Errore di rete o blocco di sicurezza");
          setIsLoading(false);
          return;
        }

        const json: ResponseDto<BoardData> = await res.json();

        if (json.success && json.data) {
          // NUOVO 4: Salviamo i dati freschi nella nostra memoria a lungo termine
          stationCache.set(cacheKey, json.data);
          setData(json.data);
          setError(null);
        } else {
          setError(json.error || "Errore sconosciuto");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBoardData();
  }, [turnstileToken, placeId, isArrivals, cacheKey]);

  const filteredTrains = useMemo(() => {
    if (!data?.trains) return [];
    if (!searchQuery) return data.trains;

    const query = searchQuery.toLowerCase();
    return data.trains.filter(
      (train) =>
        train.trainNumber.includes(query) ||
        train.station.toLowerCase().includes(query) ||
        (train.operator && train.operator.toLowerCase().includes(query)) ||
        (train.category && train.category.toLowerCase().includes(query)),
    );
  }, [data, searchQuery]);

  const renderContent = () => {
    if (isLoading && !data) {
      return (
        <div className="animate-in fade-in duration-300 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <TrainCardSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <EmptyBox
          icon={AlertTriangle}
          title="Errore nel caricamento dei dati"
          subtitle={error}
        />
      );
    }

    if (!data?.trains.length) {
      return (
        <EmptyBox
          icon={TrainIcon}
          title="Nessun treno previsto al momento per questa stazione."
        />
      );
    }

    return (
      <div className="animate-in fade-in duration-500 flex flex-col gap-4 mt-2">
        <div className="space-y-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTrains.length > 0 ? (
            filteredTrains.map((train) => (
              <TrainCard key={train.id} train={train} />
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-slate-500 font-medium text-sm">
                Nessun treno corrisponde a "{searchQuery}"
              </p>
            </div>
          )}
        </div>

        <div className="text-center mt-2 pb-6">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Ultimo aggiornamento:{" "}
            {new Date(data.lastUpdate).toLocaleTimeString()}
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      <TurnstileWidget key={widgetKey} onSuccess={handleTurnstileSuccess} />
      {renderContent()}
    </>
  );
}
