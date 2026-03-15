import { useState, useMemo, useEffect, useRef } from "react";
import { Train, AlertCircle } from "lucide-react";
import stationsData from "../../data/stations.json";
import { navigate } from "astro:transitions/client";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

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
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Filters stations and limits to 8 results to avoid UI rendering issues
   */
  const results = useMemo(() => {
    if (query.length < 2) return [];
    return stationsData
      .filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 8);
  }, [query]);

  /**
   * Selects a station and navigates to the station page
   * @param station the selected station
   */
  const handleSelect = (station: Station) => {
    onSelect(station.id, station.name);
    setQuery("");
    setIsOpen(false);
    navigate(
      `/station/${station.id}?name=${encodeURIComponent(station.name)}&tab=DEPARTURES`,
    );
  };

  /**
   * Closes the dropdown when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <Command
        className="rounded-2xl border shadow-sm overflow-visible bg-background"
        shouldFilter={false}
      >
        <CommandInput
          placeholder="Cerca una stazione"
          value={query}
          onValueChange={(val) => {
            setQuery(val);
            setIsOpen(val.length >= 2);
          }}
          onFocus={() => {
            if (query.length >= 2) setIsOpen(true);
          }}
          className="text-lg py-4 px-5 border-none focus:ring-0"
        />

        {isOpen && query.length >= 2 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-background rounded-2xl border shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <CommandList>
              {results.length === 0 && (
                <CommandEmpty className="py-8 text-center">
                  <AlertCircle className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-muted-foreground font-medium">
                    Nessuna stazione trovata
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Verifica di aver scritto bene
                  </p>
                </CommandEmpty>
              )}

              {results.length > 0 && (
                <CommandGroup>
                  {results.map((s) => (
                    <CommandItem
                      key={s.id}
                      value={s.name}
                      onSelect={() => handleSelect(s)}
                      className="flex items-center gap-4 p-4 cursor-pointer data-[selected='true']:bg-muted data-[selected='true']:text-foreground transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-secondary text-secondary-foreground">
                        <Train className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-base">{s.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </div>
        )}
      </Command>
    </div>
  );
}
