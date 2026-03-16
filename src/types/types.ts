/** Parsed train entry from RFI station board */
export interface Train {
  id: string;
  operator?: string | undefined;
  category?: string | undefined;
  trainNumber: string;
  time: string;
  delay: string | null;
  station: string;
  platform: string | null;
  nextStops: NextStop[];
  type: string;
}

/** Intermediate stop extracted from RFI schedule */
export interface NextStop {
  stop: string;
  hour: string;
}

/** Station board response containing train list and metadata */
export interface BoardData {
  stationId: string;
  type: "ARRIVALS" | "DEPARTURES";
  lastUpdate: string;
  trains: Train[];
}

/** Standard API response wrapper */
export interface ResponseDto<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Station info returned by ViaggiaTreno autocomplete API */
export interface TrenitaliaStationInfo {
  id: string;
  timestamp: string;
}

/** Current state of a train at a given stop */
export type StopState = "PASSED" | "ACTIVE" | "UPCOMING";

/** Normalized real-time stop used by the frontend */
export interface TrainRealtimeStop {
  station: string;
  scheduledTime: number | null;
  actualTime: number | null;
  delay: number;
  actualPlatform: string | null;
  state: StopState;
}

/** Complete real-time train details with all stops */
export interface TrainRealtimeDetails {
  totalDelay: number;
  hasDeparted: boolean;
  lastDetectionStation: string | null;
  lastDetectionTime: number | null;
  stops: TrainRealtimeStop[];
}

/**
 * Raw stop data from ViaggiaTreno API.
 * Field names are kept in Italian to match the external API response.
 */
export interface TrenitaliaStop {
  stazione: string;
  partenza_teorica: number | null;
  arrivo_teorico: number | null;
  programmata: number | null;
  partenzaReale: number | null;
  arrivoReale: number | null;
  ritardoPartenza: number;
  ritardoArrivo: number;
  binarioEffettivoPartenzaDescrizione: string | null;
  binarioEffettivoArrivoDescrizione: string | null;
}

/**
 * Raw train response from ViaggiaTreno "andamentoTreno" endpoint.
 * Field names are kept in Italian to match the external API response.
 */
export interface TrenitaliaTrainResponse {
  ritardo: number;
  stazioneUltimoRilevamento: string | null;
  oraUltimoRilevamento: number | null;
  fermate: TrenitaliaStop[];
}
