import type {
  StopState,
  TrainRealtimeDetails,
  TrainRealtimeStop,
  TrenitaliaStationInfo,
  TrenitaliaStop,
  TrenitaliaTrainResponse,
} from "@/types/types";
import { ApiError } from "@/lib/api-error";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  Referer: "http://www.viaggiatreno.it/",
  Origin: "http://www.viaggiatreno.it",
};

const GET_TRAIN_NUMBER_BASE_URL =
  "http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/cercaNumeroTrenoTrenoAutocomplete";
const GET_LIVE_INFO_BASE_URL =
  "http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/andamentoTreno";
const EXPECTED_TRENITALIA_RESPONSE_LENGTH = 2;
const EXPECTED_TRENITALIA_STATION_INFO_RESPONSE_LENGTH = 3;

/**
 * Gets the station info by train number from ViaggiaTreno autocomplete API
 * @param trainNumber the train number
 * @returns TrenitaliaStationInfo containing station id and timestamp, or null
 */
export async function getStationInfo(
  trainNumber: string | null | undefined,
): Promise<TrenitaliaStationInfo | null> {
  if (!trainNumber) return null;

  const res = await fetch(`${GET_TRAIN_NUMBER_BASE_URL}/${trainNumber}`, {
    headers: HEADERS,
  });

  try {
    if (!res.ok) {
      console.warn(`ViaggiaTreno HTTP Error: ${res.status}`);
      return null;
    }

    /**
     * Response pattern by Viaggiatreno:
     * {trainNumber} - {stationName} - {currentDate}|{trainNumber}-{stationId}-{timestamp}
     */
    const data: string = await res.text();

    if (!data || data.trim() === "") {
      return null;
    }

    // Get parts: ["{trainNumber} - {stationName} - {currentDate}", "{trainNumber}-{stationId}-{timestamp}"]
    const parts = data.split("|");
    if (parts.length < EXPECTED_TRENITALIA_RESPONSE_LENGTH) {
      return null;
    }

    // Get useful info: ["{trainNumber}", "{stationId}", "{timestamp}"]
    const stationInfo = parts[1].trim().split("-");
    if (stationInfo.length < EXPECTED_TRENITALIA_STATION_INFO_RESPONSE_LENGTH) {
      return null;
    }

    return {
      id: stationInfo[1],
      timestamp: stationInfo[2],
    };
  } catch (e) {
    console.error("Error during station info recover", e);
    return null;
  }
}

/**
 * Fetches real-time train details from ViaggiaTreno
 * @param stationId the origin station id
 * @param trainNumber the train number
 * @param timestamp the departure timestamp
 * @returns TrainRealtimeDetails with all stops
 */
export async function fetchTrainDetails(
  stationId: string,
  trainNumber: string,
  timestamp: string,
): Promise<TrainRealtimeDetails | null> {
  const res = await fetch(
    `${GET_LIVE_INFO_BASE_URL}/${stationId}/${trainNumber}/${timestamp}`,
    {
      headers: HEADERS,
    },
  );

  if (!res.ok) {
    throw ApiError.badGateway(`ViaggiaTreno HTTP ${res.status}`);
  }

  // Extract raw text to avoid invalid JSON response by Viaggiatreno
  const rawText = await res.text();

  if (!rawText || rawText.trim() === "") {
    throw ApiError.serviceUnavailable("ViaggiaTreno returned empty response");
  }

  const data: TrenitaliaTrainResponse = JSON.parse(rawText);

  // Ghost train filter: discard responses for trips that ended over 3 hours ago
  // This prevents stale data from the previous day around midnight
  if (data.fermate && data.fermate.length > 0) {
    const lastStop = data.fermate[data.fermate.length - 1];

    if (lastStop.arrivoReale !== null) {
      const hoursSinceArrival =
        (Date.now() - lastStop.arrivoReale) / (1000 * 60 * 60);

      if (hoursSinceArrival > 3) {
        console.warn(
          `Ghost train ignored: ${trainNumber} terminated ${hoursSinceArrival.toFixed(1)}h ago`,
        );
        return null;
      }
    }
  }

  // Find last train index to avoid missing information when viaggiatreno doesn't provide intermediary stops
  const currentTrainIndex = data.fermate.findLastIndex(
    (f: TrenitaliaStop) => f.partenzaReale !== null || f.arrivoReale !== null,
  );

  /**
   * Extract time data from a stop
   * @param s the stop
   * @param isLastStop if is the last stop
   * @returns object with scheduledTime, actualTime and delay
   */
  const extractTimeData = (s: TrenitaliaStop, isLastStop: boolean) => {
    if (s.partenzaReale !== null) {
      return {
        scheduledTime: s.partenza_teorica || s.programmata,
        actualTime: s.partenzaReale,
        delay: s.ritardoPartenza || 0,
      };
    }

    if (s.arrivoReale !== null) {
      return {
        scheduledTime: s.arrivo_teorico || s.programmata,
        actualTime: s.arrivoReale,
        delay: s.ritardoArrivo || 0,
      };
    }

    return {
      scheduledTime: isLastStop
        ? s.arrivo_teorico || s.programmata
        : s.partenza_teorica || s.programmata,
      actualTime: null,
      delay: isLastStop ? s.ritardoArrivo || 0 : s.ritardoPartenza || 0,
    };
  };

  /**
   * Determine the state of a stop
   * @param index the index of the stop
   * @param currentTrainIndex the index of the current train
   * @param s the stop
   * @param isLastStop if is the last stop
   * @returns the state of the stop
   */
  const determineStopState = (
    index: number,
    currentTrainIndex: number,
    s: TrenitaliaStop,
    isLastStop: boolean,
  ): StopState => {
    // If there are no real time data, all the stops are upcoming
    if (currentTrainIndex === -1 || index > currentTrainIndex) {
      return "UPCOMING";
    }

    // If index of the stop is smaller than current index, train is passed
    if (index < currentTrainIndex) {
      return "PASSED";
    }

    // If the current train has real departure time, it's passed
    if (s.partenzaReale !== null) {
      return "PASSED";
    }

    // If the train has arrival time, check if is the last stop
    if (s.arrivoReale !== null) {
      return isLastStop ? "PASSED" : "ACTIVE";
    }

    // Fallback
    return "UPCOMING";
  };

  // Map all the stops
  const stops: TrainRealtimeStop[] = data.fermate.map(
    (s: TrenitaliaStop, index: number) => {
      const isLastStop = index === data.fermate.length - 1;
      const state = determineStopState(index, currentTrainIndex, s, isLastStop);
      const { scheduledTime, actualTime, delay } = extractTimeData(
        s,
        isLastStop,
      );

      return {
        station: s.stazione,
        scheduledTime,
        actualTime,
        delay,
        actualPlatform:
          s.binarioEffettivoPartenzaDescrizione ||
          s.binarioEffettivoArrivoDescrizione ||
          null,
        state: state,
      };
    },
  );

  return {
    totalDelay: data.ritardo || 0,
    hasDeparted: currentTrainIndex !== -1,
    lastDetectionStation: data.stazioneUltimoRilevamento || null,
    lastDetectionTime: data.oraUltimoRilevamento || null,
    stops,
  };
}
