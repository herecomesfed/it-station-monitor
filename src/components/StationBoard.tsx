import { useState, useEffect, useMemo } from "react";
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

  /**
   * Function to fetch data from Monitor API
   */
  const fetchBoardData = async () => {
    try {
      const endpoint = `/api/monitor?placeId=${placeId}&arrivals=${isArrivals}`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Errore di rete");
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
   * Refresh research after one minute if user is navigating in the app
   */
  useEffect(() => {
    setIsLoading(true);
    fetchBoardData();

    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") fetchBoardData();
    }, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") fetchBoardData();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [placeId, isArrivals]);

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

  if (isLoading && !data) {
    return (
      <div className="animate-in fade-in duration-300 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <TrainCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  /**
   * If there was an error during api call
   */
  if (error) {
    return (
      <EmptyBox
        icon={AlertTriangle}
        title="Errore nel caricamenti dei dati"
        subtitle="Riprova più tardi"
      />
    );
  }

  /**
   * If there are no trains available for that station
   */
  if (!data?.trains.length) {
    return (
      <EmptyBox
        icon={TrainIcon}
        title="Nessun treno previsto al momento per questa stazione."
      />
    );
  }

  /**
   * Else return the train or message for train not found for the specified query
   */
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
          Ultimo aggiornamento: {new Date(data.lastUpdate).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
