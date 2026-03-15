import { useState, useEffect } from "react";
import StationSearch from "./StationSearch";
import { Clock, ChevronRight } from "lucide-react";

export default function HomeSearch() {
  const [recent, setRecent] = useState<{ id: string; name: string }[]>([]);

  /**
   * Loads recently visited stations from localStorage on mount
   */
  useEffect(() => {
    const saved = localStorage.getItem("recent_train_stations");
    if (saved) setRecent(JSON.parse(saved));
  }, []);

  /**
   * Saves a station to the recent list (max 3) in localStorage
   * @param id the id of the station
   * @param name the name of the station
   */
  const saveToRecent = (id: string, name: string) => {
    const updated = [{ id, name }, ...recent.filter((x) => x.id !== id)].slice(
      0,
      3,
    );
    localStorage.setItem("recent_train_stations", JSON.stringify(updated));
    setRecent(updated);
  };

  return (
    <div className="min-h-screen pb-10 bg-background text-foreground">
      <main className="max-w-2xl lg:max-w-5xl xl:max-w-6xl w-full mx-auto p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h1 className="text-3xl font-black mb-2">Dove vuoi andare?</h1>
        <p className="text-muted-foreground mb-8 font-medium">
          Cerca una stazione per vedere il tabellone in tempo reale.
        </p>

        <StationSearch onSelect={saveToRecent} />

        {recent.length > 0 && (
          <div className="mt-10 animate-in fade-in duration-500 delay-150 fill-mode-both">
            <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">
              Ricerche recenti
            </h2>

            <ul className="grid grid-cols-1 gap-2">
              {recent.map((s) => (
                <li key={s.id}>
                  <a
                    href={`/station/${s.id}?name=${encodeURIComponent(s.name)}&tab=DEPARTURES`}
                    onClick={() => saveToRecent(s.id, s.name)}
                    className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl hover:border-foreground/20 hover:shadow-md transition-all text-left group cursor-pointer"
                  >
                    <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center group-hover:bg-primary transition-colors shrink-0">
                      <Clock className="w-4 h-4 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
                    </div>
                    <span className="font-bold text-lg flex-1 truncate">
                      {s.name}
                    </span>
                    <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
