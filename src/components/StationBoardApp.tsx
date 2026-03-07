import { useState } from "react";
import StationBoard from "./StationBoard";
import { ChevronLeft } from "lucide-react";

export default function StationBoardApp({
  placeId,
  initialName,
}: {
  placeId: string;
  initialName: string;
}) {
  const [type, setType] = useState<"ARRIVALS" | "DEPARTURES">("DEPARTURES");

  return (
    <div className="min-h-screen pb-10">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-4 py-4 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <a
            href="/"
            className="font-black text-xl tracking-tight hover:text-blue-600 transition-colors"
          >
            LiveTrain
          </a>
          <a
            href="/"
            className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-blue-600 bg-slate-100 px-3 py-2 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> CERCA
          </a>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
        {/* TITOLO DELLA STAZIONE */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
            Tabellone di
          </span>
          <h2 className="text-3xl md:text-4xl font-black uppercase leading-none truncate">
            {initialName}
          </h2>
        </div>

        {/* SWITCH ARRIVI / PARTENZE */}
        <div className="flex bg-slate-200/60 p-1.5 rounded-2xl">
          {(["DEPARTURES", "ARRIVALS"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${
                type === t
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t === "DEPARTURES" ? "PARTENZE" : "ARRIVI"}
            </button>
          ))}
        </div>

        {/* IL TABELLONE VERO E PROPRIO */}
        <StationBoard
          key={`${placeId}-${type}`}
          placeId={placeId}
          isArrivals={type === "ARRIVALS"}
        />
      </main>
    </div>
  );
}
