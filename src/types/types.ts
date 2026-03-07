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
