import { ChevronLeft } from "lucide-react";
import { Button } from "../ui/button";

export default function AppHeader({ showBackButton = false }) {
  return (
    <nav className="bg-background sticky top-0 z-50 px-4 py-3 shadow-sm">
      <div className="max-w-2xl lg:max-w-5xl xl:max-w-6xl md:px-4 w-full mx-auto flex items-center justify-between">
        <p className="font-bold text-lg tracking-tight">IT Station Monitor</p>
        {showBackButton && (
          <Button
            variant="secondary"
            size="sm"
            asChild
            className="h-8 font-bold text-xs rounded-lg"
          >
            <a href="/">
              <ChevronLeft className="w-4 h-4 mr-1" /> Cambia Stazione
            </a>
          </Button>
        )}
      </div>
    </nav>
  );
}
