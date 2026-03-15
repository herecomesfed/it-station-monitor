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

export interface NextStop {
  stop: string;
  hour: string;
}

export interface BoardData {
  stationId: string;
  type: "ARRIVALS" | "DEPARTURES";
  lastUpdate: string;
  trains: Train[];
}

export interface ResponseDto<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface TrenitaliaStationInfo {
  id: string;
  timestamp: string;
}

export type StopState = "PASSED" | "ACTIVE" | "UPCOMING";

export interface TrainRealtimeStop {
  station: string;
  scheduledTime: number | null;
  actualTime: number | null;
  delay: number;
  actualPlatform: string | null;
  state: StopState;
}

export interface TrainRealtimeDetails {
  totalDelay: number;
  lastDetectionStation: string | null;
  lastDetectionTime: number | null;
  stops: TrainRealtimeStop[];
}

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

export interface TrenitaliaTrainResponse {
  ritardo: number;
  stazioneUltimoRilevamento: string | null;
  oraUltimoRilevamento: number | null;
  fermate: TrenitaliaStop[];
}
