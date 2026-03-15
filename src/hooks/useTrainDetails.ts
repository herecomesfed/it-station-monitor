import { useEffect, useState } from "react";
import type { TrainRealtimeDetails } from "../types/types";

interface UseTrainDetailsReturn {
  realtimeData: TrainRealtimeDetails | null;
  isLoadingRealtime: boolean;
  hasAttemptedFetch: boolean;
}

/**
 * Hook to fetch real-time train details from ViaggiaTreno
 * Only fetches when isOpen is true and the train operator is supported
 * @param trainNumber the train number
 * @param operator the train operator
 * @param isOpen whether the detail panel is open
 */
export function useTrainDetails(
  trainNumber: string,
  operator: string | undefined,
  isOpen: boolean,
): UseTrainDetailsReturn {
  const [realtimeData, setRealtimeData] =
    useState<TrainRealtimeDetails | null>(null);
  const [isLoadingRealtime, setIsLoadingRealtime] = useState(false);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);

  useEffect(() => {
    if (!isOpen || hasAttemptedFetch) return;

    const op = operator?.toLowerCase() || "";

    // If the train is not supported by Viaggiatreno, avoid api call
    const isUnsupported =
      op.includes("italo") ||
      op.includes("ntv") ||
      op.includes("sbb") ||
      op.includes("öbb");

    if (isUnsupported) {
      setHasAttemptedFetch(true);
      return;
    }

    let isMounted = true;

    const fetchRealtime = async () => {
      setIsLoadingRealtime(true);

      try {
        const res = await fetch(
          `/api/train-details?trainNumber=${trainNumber}`,
        );
        const json = await res.json();

        if (json.success && json.data && isMounted) {
          setRealtimeData(json.data);
        }
      } catch (error) {
        console.error("Error fetching realtime data, using RFI fallback:", error);
      } finally {
        if (isMounted) {
          setIsLoadingRealtime(false);
          setHasAttemptedFetch(true);
        }
      }
    };

    fetchRealtime();

    return () => {
      isMounted = false;
    };
  }, [isOpen, hasAttemptedFetch, trainNumber, operator]);

  return { realtimeData, isLoadingRealtime, hasAttemptedFetch };
}
