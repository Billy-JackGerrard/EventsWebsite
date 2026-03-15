import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
    };
  }
}

type UseTurnstileResult = {
  /** Attach this ref to the container div where the widget should render. */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** The current valid token, or null if not yet solved / expired. */
  token: string | null;
  /** Call after a failed submission to reset the widget and clear the token. */
  reset: () => void;
};

/**
 * Fix #10: Encapsulates Cloudflare Turnstile script injection, widget
 * rendering, token management, and reset — extracted from AddEvent.tsx.
 *
 * @param siteKey  The VITE_TURNSTILE_SITE_KEY value.
 * @param formKey  Increment this to force a full remount of the widget
 *                 (e.g. after a successful submission).
 */
export function useTurnstile(siteKey: string, formKey: number): UseTurnstileResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const SCRIPT_ID = "cf-turnstile-script";

    const renderWidget = () => {
      if (containerRef.current && window.turnstile && !widgetIdRef.current) {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (t: string) => setToken(t),
          "expired-callback": () => setToken(null),
          "error-callback": () => setToken(null),
          theme: "dark",
        });
      }
    };

    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      script.async = true;
      script.defer = true;
      script.onload = renderWidget;
      document.head.appendChild(script);
    } else if (window.turnstile) {
      renderWidget();
    }

    // Reset widget tracking when formKey changes so a fresh widget is rendered.
    return () => {
      widgetIdRef.current = null;
    };
  }, [siteKey, formKey]);

  const reset = () => {
    setToken(null);
    if (widgetIdRef.current) {
      window.turnstile.reset(widgetIdRef.current);
    }
  };

  return { containerRef, token, reset };
}