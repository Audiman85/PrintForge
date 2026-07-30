import { createContext, useContext, useEffect, useState } from "react";

const PwaCtx = createContext({ canInstall: false, install: () => {}, isStandalone: false });

export function PwaProvider({ children }) {
  const [deferred, setDeferred] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Register the service worker (only in production build — CRA's PUBLIC_URL respected)
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/service-worker.js").catch(() => {});
      });
    }
    // Detect standalone
    setIsStandalone(
      window.matchMedia?.("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
    const onBip = (e) => { e.preventDefault(); setDeferred(e); };
    const onInstalled = () => { setDeferred(null); setIsStandalone(true); };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return false;
    deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    return choice?.outcome === "accepted";
  };

  return (
    <PwaCtx.Provider value={{ canInstall: !!deferred, install, isStandalone }}>
      {children}
    </PwaCtx.Provider>
  );
}

export function usePwa() { return useContext(PwaCtx); }
