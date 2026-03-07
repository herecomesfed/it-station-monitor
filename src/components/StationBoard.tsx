import { useState, useEffect, useMemo } from "react";
import type { ResponseDto, BoardData } from "../types/types";
import TrainCard from "./TrainCard";
import TrainCardSkeleton from "./TrainCardSkeleton";
import { AlertTriangle, Search, X } from "lucide-react";

export default function StationBoard({
  placeId,
  isArrivals,
}: {
  placeId: string;
  isArrivals: boolean;
}) {
  const [data, setData] = useState<BoardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  useEffect(() => {
    setIsLoading(true);
    setSearchQuery("");
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

  // FILTRAGGIO AGGIORNATO: Ora include Numero, Stazione, Operatore e CATEGORIA (Frecciarossa, Italo, ecc)
  const filteredTrains = useMemo(() => {
    if (!data?.trains) return [];
    if (!searchQuery) return data.trains;

    const query = searchQuery.toLowerCase();
    return data.trains.filter(
      (train) =>
        train.trainNumber.includes(query) ||
        train.station.toLowerCase().includes(query) ||
        (train.operator && train.operator.toLowerCase().includes(query)) ||
        (train.category && train.category.toLowerCase().includes(query)), // <-- Aggiunto questo!
    );
  }, [data, searchQuery]);

  // SKELETON
  if (isLoading && !data) {
    return (
      <div className="animate-in fade-in duration-300 mt-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <TrainCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // ERRORI
  if (error) {
    return (
      <div className="mt-2 bg-red-50 border border-red-200 text-red-600 p-6 rounded-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
        <AlertTriangle className="w-8 h-8 mb-2" />
        <p className="font-bold">Impossibile caricare i dati</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  // NESSUN TRENO IN STAZIONE
  if (!data?.trains.length) {
    return (
      <div className="mt-2 text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm animate-in fade-in duration-300">
        <p className="text-slate-500 font-medium">
          Nessun treno previsto al momento per questa stazione.
        </p>
      </div>
    );
  }

  // RENDER TABELLONE
  return (
    <div className="animate-in fade-in duration-500 flex flex-col gap-4 mt-2">
      {/* BARRA DI RICERCA INTERNA */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Cerca per treno (es. Frecciarossa, Italo, 9612)..."
          className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium text-slate-700"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* LISTA TRENI */}
      <div className="space-y-3">
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
