import { useState, useEffect, useMemo, useRef } from "react";
import type { ResponseDto, BoardData } from "../types/types";
import TrainCard from "./TrainCard";
import TrainCardSkeleton from "./TrainCardSkeleton";
import { AlertTriangle, Search, TrainIcon, X } from "lucide-react";
import EmptyBox from "./EmptyBox";

export default function StationBoard({
  placeId,
  isArrivals,
  searchQuery,
}: {
  placeId: string;
  isArrivals: boolean;
  searchQuery: string;
}) {
  const [data, setData] = useState<BoardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);
  const widgetRef = useRef<HTMLElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  /**
   * Function to fetch data from Monitor API
   */
  const fetchBoardData = async (payload: string) => {
    try {
      const endpoint = `/api/monitor?placeId=${placeId}&arrivals=${isArrivals}`;
      const res = await fetch(endpoint, {
        headers: {
          "X-Altcha-Payload": payload,
        },
      });

      if (!res.ok) {
        if (res.status === 403) {
          setRefreshKey((prev) => prev + 1);
          throw new Error("Il token di sicurezza si sta rigenerando...");
        }
        throw new Error("Errore di rete");
      }

      const json: ResponseDto<BoardData> = await res.json();

      if (json.success && json.data) {
        setData(json.data);
        setError(null);
      } else {
        throw new Error(json.error || "Errore sconosciuto");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Listen altcha changes
   */
  useEffect(() => {
    const handleStateChange = (ev: Event) => {
      const event = ev as CustomEvent;
      if (event.detail.state === "verified" && event.detail.payload) {
        fetchBoardData(event.detail.payload);
      } else if (event.detail.state === "error") {
        setError("Errore nella verifica del dispositivo.");
        setIsLoading(false);
      }
    };

    const widget = widgetRef.current;
    if (widget) {
      widget.addEventListener("statechange", handleStateChange);
    }

    return () => {
      if (widget) {
        widget.removeEventListener("statechange", handleStateChange);
      }
    };
  }, [placeId, isArrivals, refreshKey]);

  /**
   * Token regenerator
   */
  useEffect(() => {
    import("altcha").catch(console.error);
    setIsMounted(true);

    // If the user is in page, regenerate token after 1 min
    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        setRefreshKey((prev) => prev + 1);
      }
    }, 60000);

    // Regenerate token when visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setRefreshKey((prev) => prev + 1);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  /**
   * Memoized trains for internal search
   */
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
    // If is loading
    if (isLoading && !data) {
      return (
        <div className="animate-in fade-in duration-300 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <TrainCardSkeleton key={i} />
          ))}
        </div>
      );
    }

    // if error
    if (error) {
      return (
        <div className="mt-4">
          <EmptyBox
            icon={AlertTriangle}
            title="Errore nel caricamento dei dati"
            subtitle={error}
          />
        </div>
      );
    }

    // No trains
    if (!data?.trains.length) {
      return (
        <div className="mt-4">
          <EmptyBox
            icon={TrainIcon}
            title="Nessun treno previsto al momento per questa stazione."
          />
        </div>
      );
    }

    // success
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
    <div className="flex flex-col">
      <div className="hidden" key={refreshKey}>
        {isMounted && (
          <altcha-widget
            ref={widgetRef}
            challengeurl="/api/altcha"
            auto="onload"
          ></altcha-widget>
        )}
      </div>

      {renderContent()}
    </div>
  );
}
