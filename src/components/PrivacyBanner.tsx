import { useState, useEffect, useRef } from "react";
import type { View } from "../utils/views";
import "./PrivacyBanner.css";

const STORAGE_KEY = "privacy-notice-dismissed";

type Props = {
  onNavigate: (view: View) => void;
};

export default function PrivacyBanner({ onNavigate }: Props) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(STORAGE_KEY) === "1"
  );
  const bannerRef = useRef<HTMLDivElement>(null);

  // Set a CSS variable on :root so .page-view gets matching bottom padding
  useEffect(() => {
    if (dismissed) {
      document.documentElement.style.setProperty("--privacy-banner-height", "0px");
      return;
    }
    const update = () => {
      const h = bannerRef.current?.offsetHeight ?? 0;
      document.documentElement.style.setProperty("--privacy-banner-height", `${h}px`);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [dismissed]);

  if (dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="privacy-banner" ref={bannerRef} role="region" aria-label="Privacy notice">
      <p className="privacy-banner-text">
        This site collects event submission data to run the Edinburgh BSL Community calendar.{" "}
        <button
          className="privacy-banner-link"
          onClick={() => onNavigate("privacy")}
        >
          Privacy policy
        </button>
      </p>
      <button
        className="privacy-banner-dismiss"
        onClick={dismiss}
        aria-label="Dismiss privacy notice"
      >
        Got it
      </button>
    </div>
  );
}
