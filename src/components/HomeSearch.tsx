import { useState, useEffect } from "react";
import StationSearch from "./StationSearch";
import { Train, Clock } from "lucide-react";

export default function HomeSearch() {
  const [recent, setRecent] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("recent_train_stations");
    if (saved) setRecent(JSON.parse(saved));
  }, []);

  // Ora questa funzione SALVA SOLO in memoria, non fa redirect
  const saveToRecent = (id: string, name: string) => {
    const updated = [{ id, name }, ...recent.filter((x) => x.id !== id)].slice(
      0,
      3,
    );
    localStorage.setItem("recent_train_stations", JSON.stringify(updated));
    setRecent(updated);
  };

  return (
    <div className="min-h-screen pb-10">
      {/* ... header e titoli rimangono uguali ... */}

      <main className="max-w-2xl mx-auto p-4 md:p-6 mt-6 animate-in fade-in duration-500">
        <h2 className="text-3xl font-black text-slate-900 mb-2">
          Dove vuoi andare?
        </h2>

        {/* Passiamo saveToRecent a StationSearch */}
        <StationSearch onSelect={saveToRecent} />

        {recent.length > 0 && (
          <div className="mt-10">
            <h3 className="text-[10px] font-black uppercase text-slate-400 mb-4">
              Ricerche recenti
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {recent.map((s) => (
                <a
                  key={s.id}
                  href={`/station/${s.id}?name=${encodeURIComponent(s.name)}`}
                  onClick={() => saveToRecent(s.id, s.name)}
                  className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-300 hover:shadow-md transition-all text-left group cursor-pointer"
                >
                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <Clock className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                  </div>
                  <span className="font-bold text-slate-700">{s.name}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
