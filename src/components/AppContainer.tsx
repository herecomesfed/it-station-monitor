import { useState, useEffect } from "react";
import { Train as TrainIcon, Search, Clock, ChevronLeft } from "lucide-react";
import StationSearch from "./StationSearch";
import StationBoard from "./StationBoard";

export default function AppContainer() {
  const [station, setStation] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [type, setType] = useState<"ARRIVALS" | "DEPARTURES">("DEPARTURES");
  const [recent, setRecent] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("recent_train_stations");
    if (saved) setRecent(JSON.parse(saved));
  }, []);

  const selectStation = (id: string, name: string) => {
    const newStation = { id, name };
    setStation(newStation);

    const updated = [newStation, ...recent.filter((x) => x.id !== id)].slice(
      0,
      3,
    );
    setRecent(updated);
    localStorage.setItem("recent_train_stations", JSON.stringify(updated));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-10">
      {/* Header Responsive */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-4 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-xl">
              <TrainIcon className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-black text-xl tracking-tighter">LiveTrain</h1>
          </div>
          {station && (
            <button
              onClick={() => setStation(null)}
              className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> CAMBIA
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 md:p-6">
        {!station ? (
          <div className="py-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2 text-center md:text-left">
              <h2 className="text-4xl font-black tracking-tight">
                Cerca Stazione
              </h2>
              <p className="text-slate-500 font-medium">
                Controlla i binari e i ritardi in tempo reale.
              </p>
            </div>

            <StationSearch onSelect={selectStation} />

            {recent.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Ricerche Recenti
                </h3>
                <div className="grid gap-2">
                  {recent.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStation(s)}
                      className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-300 hover:shadow-md transition-all text-left group"
                    >
                      <Clock className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
                      <span className="font-bold text-slate-700">{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">
                Tabellone di
              </span>
              <h2 className="text-3xl font-black uppercase leading-none">
                {station.name}
              </h2>
            </div>

            {/* Switch Moderno */}
            <div className="flex bg-slate-200/50 p-1 rounded-2xl">
              {(["DEPARTURES", "ARRIVALS"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${type === t ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  {t === "DEPARTURES" ? "PARTENZE" : "ARRIVI"}
                </button>
              ))}
            </div>

            <StationBoard
              key={`${station.id}-${type}`}
              placeId={station.id}
              isArrivals={type === "ARRIVALS"}
            />
          </div>
        )}
      </main>
    </div>
  );
}
