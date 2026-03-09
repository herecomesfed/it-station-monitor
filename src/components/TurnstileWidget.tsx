import { useEffect, useRef, useState } from "react";

interface TurnstileProps {
  onSuccess: (token: string) => void;
}

export default function TurnstileWidget({ onSuccess }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [phase, setPhase] = useState<"hidden" | "visible" | "fading-out">(
    "hidden",
  );

  useEffect(() => {
    const renderWidget = () => {
      const turnstile = (window as any).turnstile;
      if (turnstile && containerRef.current && !widgetIdRef.current) {
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: import.meta.env.PUBLIC_TURNSTILE_SITE_KEY,
          appearance: "interaction-only",

          "before-interactive-callback": () => {
            setPhase("visible");
          },

          callback: (token: string) => {
            onSuccess(token);
            setPhase("fading-out");
          },

          "error-callback": (err: any) => {
            console.error("Turnstile: Errore critico", err);
          },
        });
      }
    };

    if ((window as any).turnstile) {
      renderWidget();
    } else {
      const interval = setInterval(() => {
        if ((window as any).turnstile) {
          clearInterval(interval);
          renderWidget();
        }
      }, 100);
      return () => clearInterval(interval);
    }

    return () => {
      const turnstile = (window as any).turnstile;
      if (turnstile && widgetIdRef.current !== null) {
        turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [onSuccess]);

  const isShown = phase === "visible";

  return (
    <div
      style={{
        opacity: isShown ? 1 : 0,
        maxHeight: isShown ? "200px" : "0px",
        overflow: "hidden",
        transition: "opacity 0.4s ease, max-height 0.4s ease",
        pointerEvents: isShown ? "auto" : "none",
      }}
      onTransitionEnd={() => {
        if (phase === "fading-out") {
          setPhase("hidden");
        }
      }}
    >
      <div className="flex flex-col items-center justify-center w-full py-4">
        <div ref={containerRef} className="flex justify-center" />
      </div>
    </div>
  );
}
