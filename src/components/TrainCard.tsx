import { useState } from "react";
import type { Train } from "../types/types";
import { ChevronDown, Info } from "lucide-react";

export default function TrainCard({ train }: { train: Train }) {
  const [open, setOpen] = useState(false);
  const isArrival = train.type === "ARRIVAL";

  const delayVal = parseInt(train.delay || "0");
  const hasDelay = delayVal > 0 && train.delay?.toLowerCase() !== "nessuno";

  const trainCategory =
    train.category && train.category !== "TRENO" ? train.category : "Treno";

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow mb-3 overflow-hidden">
      {/* Train info */}
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* NOME DEL TRENO E OPERATORE (Es. TRENITALIA - Frecciarossa 9612) */}
          <div className="flex flex-col items-start gap-2 mb-1.5 flex-wrap">
            <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md uppercase tracking-wide border border-blue-100">
              {train.operator || "N.D."}
            </span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {trainCategory} {train.trainNumber}
            </span>
          </div>

          {/* Train Station */}
          <h3 className="text-lg md:text-xl font-black text-slate-800 truncate flex items-center gap-1.5">
            <span className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider">
              {isArrival ? "Da" : "Per"}
            </span>
            <span className="truncate">{train.station}</span>
          </h3>
        </div>

        {/* Schedule */}
        <div className="text-right shrink-0">
          <div className="text-2xl md:text-3xl font-black text-slate-900 leading-none">
            {train.time}
          </div>
          <div
            className={`text-[10px] md:text-[11px] font-black mt-1.5 px-2 py-0.5 rounded-md inline-block ${
              hasDelay
                ? "bg-red-50 text-red-600 border border-red-100"
                : "bg-emerald-50 text-emerald-600 border border-emerald-100"
            }`}
          >
            {hasDelay ? `+${train.delay}' RITARDO` : "IN ORARIO"}
          </div>
        </div>
      </div>

      {/* Platform and details */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
            Binario
          </span>
          <span className="text-lg md:text-xl font-black text-slate-800 leading-none">
            {train.platform}
          </span>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            open
              ? "bg-slate-800 text-white"
              : "bg-slate-50 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {open ? "Chiudi" : "Dettagli"}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* Next stops */}
      {open && (
        <div className="mt-4 pt-4 border-t border-dashed border-slate-100 animate-in slide-in-from-top-2 duration-300">
          {train.nextStops.length > 0 ? (
            <div className="space-y-3 relative pl-4">
              <div className="absolute left-4.75 top-0 bottom-0 w-px bg-slate-100"></div>
              {train.nextStops.map((s, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center text-sm relative"
                >
                  <div className="absolute -left-[3.5px] w-2 h-2 rounded-full bg-slate-300 border-2 border-white"></div>
                  <span className="ml-4 font-bold text-slate-700">
                    {s.stop}
                  </span>
                  <span className="font-mono text-xs text-slate-400">
                    {s.hour}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 p-4 rounded-xl text-center">
              <Info className="w-4 h-4 text-slate-300 mx-auto mb-1" />
              <p className="text-[10px] text-slate-400 font-medium italic">
                Fermate non disponibili per questo treno.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
