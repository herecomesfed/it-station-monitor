import TrainCard from "./TrainCard";
import TrainCardSkeleton from "./TrainCardSkeleton";
import { AlertTriangle, TrainIcon } from "lucide-react";
import EmptyBox from "../common/EmptyBox";
import { useBoardData } from "@/hooks/useBoardData";

export default function StationBoard({
  placeId,
  isArrivals,
  searchQuery,
}: {
  placeId: string;
  isArrivals: boolean;
  searchQuery: string;
}) {
  const { data, isLoading, error, filteredTrains } = useBoardData(
    placeId,
    isArrivals,
    searchQuery,
  );

  if (isLoading && !data) {
    return (
      <div className="animate-in fade-in duration-300 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <TrainCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyBox
        icon={AlertTriangle}
        title="Errore nel caricamenti dei dati"
        subtitle="Riprova più tardi"
      />
    );
  }

  if (!data?.trains.length) {
    return (
      <EmptyBox
        icon={TrainIcon}
        title="Nessun treno previsto al momento per questa stazione."
      />
    );
  }

  return (
    <div className="animate-in fade-in duration-500 flex flex-col gap-4 mt-2">
      <div className="space-y-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredTrains.length > 0 ? (
          filteredTrains.map((train) => (
            <TrainCard key={train.id} train={train} />
          ))
        ) : (
          <div className="text-center py-12 bg-card rounded-2xl border border-border shadow-sm">
            <p className="text-muted-foreground font-medium text-sm">
              Nessun treno corrisponde a "{searchQuery}"
            </p>
          </div>
        )}
      </div>

      <div className="text-center mt-2 pb-6">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Ultimo aggiornamento: {new Date(data.lastUpdate).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
