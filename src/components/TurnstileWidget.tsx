import { useEffect, useRef } from "react";

interface TurnstileProps {
  onSuccess: (token: string) => void;
}

export default function TurnstileWidget({ onSuccess }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    const renderWidget = () => {
      const turnstile = (window as any).turnstile;

      if (turnstile && containerRef.current && !widgetIdRef.current) {
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: import.meta.env.PUBLIC_TURNSTILE_SITE_KEY,
          callback: (token: string) => {
            onSuccess(token);
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

  return <div ref={containerRef} className="hidden" />;
}
