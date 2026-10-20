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
const REQUEST_TIMEOUT_MS = 8000;
// ViaggiaTreno uses "--" as placeholder when the train has not been detected yet
const NO_DETECTION_PLACEHOLDER = "--";

/**
 * Performs a GET to ViaggiaTreno and returns the raw body.
 * Upstream failures are raised as ApiError so they are not mistaken for "train not found".
 * @param url the ViaggiaTreno url
 * @returns the response body as text
 */
async function fetchViaggiaTreno(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }).catch((e: unknown) => {
    console.error(`ViaggiaTreno network error on ${url}`, e);
    throw ApiError.badGateway("ViaggiaTreno unreachable");
  });

  if (!res.ok) {
    console.warn(`ViaggiaTreno HTTP ${res.status} on ${url}`);
    throw ApiError.badGateway(`ViaggiaTreno HTTP ${res.status}`);
  }

  return res.text();
}

/**
 * Parses a single autocomplete line
 * @param line "{trainNumber} - {stationName} - {currentDate}|{trainNumber}-{stationId}-{timestamp}"
 * @returns TrenitaliaStationInfo or null if the line is malformed
 */
function parseStationInfoLine(line: string): TrenitaliaStationInfo | null {
  // Get parts: ["{trainNumber} - {stationName} - {currentDate}", "{trainNumber}-{stationId}-{timestamp}"]
  const parts = line.split("|");
  if (parts.length < EXPECTED_TRENITALIA_RESPONSE_LENGTH) {
    return null;
  }

  // Get useful info: ["{trainNumber}", "{stationId}", "{timestamp}"]
  const stationInfo = parts[1].trim().split("-");
  if (stationInfo.length < EXPECTED_TRENITALIA_STATION_INFO_RESPONSE_LENGTH) {
    return null;
  }

  // Station names may contain "-", so take everything between the first and the last " - "
  const label = parts[0].split(" - ");
  const originName = label.length >= 3 ? label.slice(1, -1).join(" - ").trim() : null;

  return {
    id: stationInfo[1],
    timestamp: stationInfo[2],
    originName,
  };
}

/**
 * Gets all the trains matching a train number from ViaggiaTreno autocomplete API.
 * The same number can be shared by different trains (one line per train).
 * @param trainNumber the train number
 * @returns the list of matching TrenitaliaStationInfo, empty if the train is not found
 */
export async function getStationInfo(
  trainNumber: string | null | undefined,
): Promise<TrenitaliaStationInfo[]> {
  if (!trainNumber) return [];

  /**
   * Response pattern by Viaggiatreno, one line per matching train:
   * {trainNumber} - {stationName} - {currentDate}|{trainNumber}-{stationId}-{timestamp}
   */
  const data = await fetchViaggiaTreno(
    `${GET_TRAIN_NUMBER_BASE_URL}/${encodeURIComponent(trainNumber)}`,
  );

  const lines = data
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const candidates = lines
    .map(parseStationInfoLine)
    .filter((info): info is TrenitaliaStationInfo => info !== null);

  // A non empty body that we cannot parse means ViaggiaTreno changed format or served a block page
  if (lines.length > 0 && candidates.length === 0) {
    console.warn(`Unexpected ViaggiaTreno autocomplete response: ${data.slice(0, 200)}`);
    throw ApiError.badGateway("Unexpected ViaggiaTreno response");
  }

  return candidates;
}

/**
 * Normalizes a station name to compare RFI and ViaggiaTreno names
 * @param name the station name
 * @returns the normalized name
 */
const normalizeStationName = (name: string) =>
  name.toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * Resolves the real-time details when a train number matches more trains.
 * Picks the train that stops at the given station, falling back to the first available one.
 * @param candidates the trains returned by getStationInfo
 * @param trainNumber the train number
 * @param stationHint a station the train is known to stop at (origin or destination from RFI)
 * @returns TrainRealtimeDetails or null if no candidate has data
 */
export async function findTrainDetails(
  candidates: TrenitaliaStationInfo[],
  trainNumber: string,
  stationHint?: string | null,
): Promise<TrainRealtimeDetails | null> {
  const hint = stationHint ? normalizeStationName(stationHint) : null;

  // Arrivals board gives the origin, which the autocomplete already exposes
  const originMatch =
    hint &&
    candidates.find(
      (c) => c.originName && normalizeStationName(c.originName) === hint,
    );
  const single = candidates.length === 1 ? candidates[0] : originMatch;

  if (single) {
    return fetchTrainDetails(single.id, trainNumber, single.timestamp);
  }

  const results = await Promise.allSettled(
    candidates.map((c) => fetchTrainDetails(c.id, trainNumber, c.timestamp)),
  );

  const available = results
    .filter(
      (r): r is PromiseFulfilledResult<TrainRealtimeDetails | null> =>
        r.status === "fulfilled",
    )
    .map((r) => r.value)
    .filter((d): d is TrainRealtimeDetails => d !== null);

  // Every call failed: propagate the upstream error
  if (available.length === 0) {
    const failure = results.find(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );
    if (failure) throw failure.reason;
    return null;
  }

  if (hint) {
    const match = available.find((d) =>
      d.stops.some((s) => normalizeStationName(s.station) === hint),
    );
    if (match) return match;
  }

  return available[0];
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
  // Extract raw text to avoid invalid JSON response by Viaggiatreno
  const rawText = await fetchViaggiaTreno(
    `${GET_LIVE_INFO_BASE_URL}/${stationId}/${encodeURIComponent(trainNumber)}/${timestamp}`,
  );

  if (!rawText || rawText.trim() === "") {
    throw ApiError.serviceUnavailable("ViaggiaTreno returned empty response");
  }

  const data = parseTrainResponse(rawText);

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
        scheduledArrivalTime: s.arrivo_teorico,
        actualArrivalTime: s.arrivoReale,
        delay: s.ritardoPartenza || 0,
        arrivalDelay: s.ritardoArrivo || 0,
      };
    }

    if (s.arrivoReale !== null) {
      return {
        scheduledTime: s.arrivo_teorico || s.programmata,
        actualTime: s.arrivoReale,
        scheduledArrivalTime: s.arrivo_teorico,
        actualArrivalTime: s.arrivoReale,
        delay: s.ritardoArrivo || 0,
        arrivalDelay: s.ritardoArrivo || 0,
      };
    }

    return {
      scheduledTime: s.partenza_teorica || s.programmata,
      actualTime: null,
      scheduledArrivalTime: s.arrivo_teorico,
      actualArrivalTime: null,
      delay: s.ritardoPartenza || 0,
      arrivalDelay: s.ritardoArrivo || 0,
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
      const {
        scheduledTime,
        actualTime,
        delay,
        scheduledArrivalTime,
        actualArrivalTime,
        arrivalDelay,
      } = extractTimeData(s, isLastStop);

      return {
        station: s.stazione,
        scheduledTime,
        actualTime,
        delay,
        scheduledArrivalTime,
        actualArrivalTime,
        arrivalDelay,
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
    lastDetectionStation:
      data.stazioneUltimoRilevamento &&
      data.stazioneUltimoRilevamento !== NO_DETECTION_PLACEHOLDER
        ? data.stazioneUltimoRilevamento
        : null,
    lastDetectionTime: data.oraUltimoRilevamento || null,
    stops,
  };
}

/**
 * Parses the andamentoTreno body, raising an ApiError if it is not the expected JSON
 * @param rawText the raw response body
 * @returns the parsed TrenitaliaTrainResponse
 */
function parseTrainResponse(rawText: string): TrenitaliaTrainResponse {
  try {
    const data: TrenitaliaTrainResponse = JSON.parse(rawText);
    if (!Array.isArray(data.fermate)) {
      throw new Error("Missing fermate");
    }
    return data;
  } catch (e) {
    console.warn(`Unexpected ViaggiaTreno train response: ${rawText.slice(0, 200)}`, e);
    throw ApiError.badGateway("Unexpected ViaggiaTreno response");
  }
}
