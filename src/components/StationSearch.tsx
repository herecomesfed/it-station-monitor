import { useState, useMemo, useEffect, useRef } from "react";
import { Search, Train, X, AlertCircle } from "lucide-react";
import stationsData from "../data/stations.json";

interface Station {
  id: string;
  name: string;
}

export default function StationSearch({
  onSelect,
}: {
  onSelect: (id: string, name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1); // Per la navigazione con le frecce
  const containerRef = useRef<HTMLDivElement>(null);

  // Filtraggio intelligente
  const results = useMemo(() => {
    if (query.length < 2) return [];
    return stationsData
      .filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 8);
  }, [query]);

  // Gestione tastiera
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && results[activeIndex]) {
        selectStation(results[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const selectStation = (station: Station) => {
    onSelect(station.id, station.name);
    setQuery(station.name);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  // Chiudi cliccando fuori
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative group">
        <Search
          className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isOpen ? "text-blue-500" : "text-slate-400"}`}
        />
        <input
          type="text"
          placeholder="Search for a station..."
          className="w-full pl-12 pr-10 py-4 bg-white border-none rounded-2xl shadow-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-lg"
          value={query}
          onKeyDown={handleKeyDown}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* RISULTATI / EMPTY STATE */}
      {isOpen && query.length >= 2 && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {results.length > 0 ? (
            results.map((s, index) => (
              /* Usiamo <a> invece di <button> */
              <a
                key={s.id}
                href={`/station/${s.id}?name=${encodeURIComponent(s.name)}`}
                onClick={() => onSelect(s.id, s.name)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`w-full flex items-center gap-4 p-4 text-left transition-colors border-b border-slate-50 last:border-none cursor-pointer ${
                  index === activeIndex ? "bg-blue-50" : "bg-white"
                }`}
              >
                <div
                  className={`p-2 rounded-lg transition-colors ${index === activeIndex ? "bg-blue-100" : "bg-slate-100"}`}
                >
                  <Train
                    className={`w-4 h-4 ${index === activeIndex ? "text-blue-600" : "text-slate-600"}`}
                  />
                </div>
                <span
                  className={`font-medium ${index === activeIndex ? "text-blue-700" : "text-slate-700"}`}
                >
                  {s.name}
                </span>
              </a>
            ))
          ) : (
            <div className="p-8 text-center">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 font-medium">
                No stations found for "{query}"
              </p>
              <p className="text-slate-400 text-xs mt-1">
                Check the spelling or try another city
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
