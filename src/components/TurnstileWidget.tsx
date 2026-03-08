import { useEffect, useRef, useState } from "react";

interface TurnstileProps {
  onSuccess: (token: string) => void;
}

export default function TurnstileWidget({ onSuccess }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const renderWidget = () => {
      const turnstile = (window as any).turnstile;

      if (turnstile && containerRef.current && !widgetIdRef.current) {
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: import.meta.env.PUBLIC_TURNSTILE_SITE_KEY,
          "before-interactive": () => {
            setShouldShow(true);
          },
          callback: (token: string) => {
            onSuccess(token);
            setShouldShow(false);
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

  return (
    <div
      className={`flex flex-col items-center justify-center py-4 animate-in fade-in duration-500 ${!shouldShow ? "hidden" : ""}`}
    >
      <p className="text-xs text-muted-foreground mb-2 font-medium">
        Verifica di sicurezza richiesta per proseguire:
      </p>
      <div ref={containerRef} />
    </div>
  );
}
