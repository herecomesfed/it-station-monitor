import type {
  StopState,
  TrainRealtimeDetails,
  TrainRealtimeStop,
  TrenitaliaStationInfo,
  TrenitaliaStop,
  TrenitaliaTrainResponse,
} from "@/types/types";

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
): Promise<TrainRealtimeDetails> {
  const res = await fetch(
    `${GET_LIVE_INFO_BASE_URL}/${stationId}/${trainNumber}/${timestamp}`,
    {
      headers: HEADERS,
    },
  );

  if (!res.ok) {
    throw new Error("HTTP Error during viaggiatreno request");
  }

  const data: TrenitaliaTrainResponse = await res.json();

  // Find last train index to avoid missing information when viaggiatreno doesn't provide intermediary stops
  const currentTrainIndex = data.fermate.findLastIndex(
    (f: TrenitaliaStop) =>
      f.partenzaReale !== null || f.arrivoReale !== null,
  );

  // Map all the stops
  const stops: TrainRealtimeStop[] = data.fermate.map(
    (s: TrenitaliaStop, index: number) => {
      let state: StopState = "UPCOMING";

      // If index of the stop is smaller than current index, train is passed
      if (currentTrainIndex !== -1 && index < currentTrainIndex) {
        state = "PASSED";
      } else if (index === currentTrainIndex) {
        // If the current train has real departure time, it's passed
        if (s.partenzaReale !== null) {
          state = "PASSED";
        } else if (s.arrivoReale !== null) {
          // If the train has arrival time, check if is the last stop
          const isLastStop = index === data.fermate.length - 1;
          state = isLastStop ? "PASSED" : "ACTIVE";
        }
      }

      return {
        station: s.stazione,
        scheduledTime:
          s.partenza_teorica || s.arrivo_teorico || s.programmata,
        actualTime: s.partenzaReale || s.arrivoReale || null,
        delay: s.ritardoPartenza || s.ritardoArrivo || 0,
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
    lastDetectionStation: data.stazioneUltimoRilevamento || null,
    lastDetectionTime: data.oraUltimoRilevamento || null,
    stops,
  };
}
