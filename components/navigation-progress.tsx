"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
  return (
    <>
      <NavigationProgressMarkup />
      <React.Suspense fallback={null}>
        <NavigationProgressController />
      </React.Suspense>
    </>
  );
}

function NavigationProgressController() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const statusTimerRef = React.useRef<number | null>(null);
  const settleTimerRef = React.useRef<number | null>(null);
  const safetyTimerRef = React.useRef<number | null>(null);

  const clearTimers = React.useCallback(() => {
    for (const timer of [
      statusTimerRef.current,
      settleTimerRef.current,
      safetyTimerRef.current,
    ]) {
      if (timer) window.clearTimeout(timer);
    }

    statusTimerRef.current = null;
    settleTimerRef.current = null;
    safetyTimerRef.current = null;
  }, []);

  const finishNavigation = React.useCallback(() => {
    const root = document.documentElement;

    if (!root.dataset.routeLoading) return;

    clearTimers();
    delete root.dataset.routeLoadingSlow;
    root.dataset.routeLoading = "settling";

    settleTimerRef.current = window.setTimeout(() => {
      if (root.dataset.routeLoading === "settling") {
        delete root.dataset.routeLoading;
      }

      settleTimerRef.current = null;
    }, 220);
  }, [clearTimers]);

  const startNavigation = React.useCallback(() => {
    const root = document.documentElement;

    clearTimers();
    delete root.dataset.routeLoadingSlow;
    root.dataset.routeLoading = "true";

    statusTimerRef.current = window.setTimeout(() => {
      root.dataset.routeLoadingSlow = "true";
      statusTimerRef.current = null;
    }, 450);

    safetyTimerRef.current = window.setTimeout(() => {
      finishNavigation();
    }, 12000);
  }, [clearTimers, finishNavigation]);

  React.useEffect(() => {
    finishNavigation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  React.useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (
        !anchor ||
        (anchor.target && anchor.target !== "_self") ||
        anchor.hasAttribute("download")
      ) {
        return;
      }

      const rawHref = anchor.getAttribute("href");
      if (!rawHref || rawHref.startsWith("#")) return;

      const nextUrl = new URL(anchor.href, window.location.href);
      const currentUrl = new URL(window.location.href);

      if (nextUrl.origin !== currentUrl.origin) return;

      const nextRoute = `${nextUrl.pathname}${nextUrl.search}`;
      const currentRoute = `${currentUrl.pathname}${currentUrl.search}`;

      if (nextRoute === currentRoute) return;

      startNavigation();
    };

    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", startNavigation);
    window.addEventListener("beforeunload", startNavigation);

    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", startNavigation);
      window.removeEventListener("beforeunload", startNavigation);
      clearTimers();
    };
  }, [clearTimers, startNavigation]);

  return null;
}

function NavigationProgressMarkup() {
  return (
    <>
      <div
        aria-hidden="true"
        className="navigation-progress pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-transparent sm:h-1"
      >
        <div className="navigation-progress-bar h-full origin-left bg-primary shadow-sm" />
      </div>

      <div
        role="status"
        aria-live="polite"
        className="navigation-progress-status pointer-events-none fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.875rem)] z-[101] flex items-center justify-center gap-2 rounded-lg border bg-background/95 px-3 py-2 text-[13px] text-muted-foreground shadow-sm backdrop-blur sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-4 sm:justify-start sm:rounded-md sm:text-sm"
      >
        <Loader2 className="size-4 animate-spin" />
        <span>Se încarcă...</span>
      </div>
    </>
  );
}
