"use client";

import { useSyncExternalStore } from "react";

type SiteConsent = {
  inEurope: boolean;
  choice: () => string | null;
  set: (c: "granted" | "denied") => void;
};

const CHANGED = "ga-consent-change";
const consent = () => (window as unknown as { siteConsent?: SiteConsent }).siteConsent;
const subscribe = (cb: () => void) => {
  window.addEventListener(CHANGED, cb);
  return () => window.removeEventListener(CHANGED, cb);
};
// "granted" / "other" for visitors on a European time zone, null for everyone else
const snapshot = () => {
  const sc = consent();
  return sc && sc.inEurope ? (sc.choice() === "granted" ? "granted" : "other") : null;
};

// Lets visitors on a European time zone change their Google Analytics answer
// (window.siteConsent comes from GoogleAnalyticsScript in layout.tsx).
export default function GaChoice() {
  const state = useSyncExternalStore(subscribe, snapshot, () => null);
  if (!state) return null;
  const allowed = state === "granted";
  const toggle = () => {
    consent()?.set(allowed ? "denied" : "granted");
    window.dispatchEvent(new Event(CHANGED));
  };
  return (
    <span>
      {" "}Your Google Analytics choice: <strong>{allowed ? "allowed" : "not allowed"}</strong>{" "}
      <button
        type="button"
        onClick={toggle}
        className="ml-1 rounded border border-gray-400 px-2 py-0.5 text-sm text-blue-600 dark:border-gray-600 dark:text-blue-400"
      >
        {allowed ? "Withdraw" : "Allow"}
      </button>
    </span>
  );
}
