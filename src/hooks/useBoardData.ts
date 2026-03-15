import { useState, useEffect, useMemo } from "react";
import type { ResponseDto, BoardData, Train } from "../types/types";

interface UseBoardDataReturn {
  data: BoardData | null;
  isLoading: boolean;
  error: string | null;
  filteredTrains: Train[];
}

/**
 * Hook to fetch and manage station board data with auto-refresh
 * @param placeId the station place id
 * @param isArrivals whether to fetch arrivals or departures
 * @param searchQuery optional search query to filter trains
 */
export function useBoardData(
  placeId: string,
  isArrivals: boolean,
  searchQuery: string = "",
): UseBoardDataReturn {
  const [data, setData] = useState<BoardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Errore sconosciuto";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh data after one minute if user is navigating in the app
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

  return { data, isLoading, error, filteredTrains };
}
