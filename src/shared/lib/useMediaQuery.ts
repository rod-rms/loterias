import { useEffect, useState } from "react";

/**
 * Reactive media query. `fallback` is used where `matchMedia` does not exist (jsdom); the shell passes `true`
 * for its desktop breakpoint so unit tests render the sidebar variant deterministically.
 */
export function useMediaQuery(query: string, fallback = false): boolean {
  const read = () => (typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(query).matches : fallback);
  const [matches, setMatches] = useState<boolean>(read);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}
