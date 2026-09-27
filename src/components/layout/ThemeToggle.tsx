"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";
export const THEME_KEY = "talentbridge:theme";

export const themeScript = `(function(){var t="light";try{if(localStorage.getItem("${THEME_KEY}")==="dark")t="dark"}catch(e){}document.documentElement.dataset.theme=t})()`;

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

const getSnapshot = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
const getServerSnapshot = (): Theme | null => null;

function apply(next: Theme) {
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {}
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const next: Theme = theme === "dark" ? "light" : "dark";

  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const root = document.documentElement;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduced) return apply(next);
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    root.style.setProperty("--reveal-x", `${x}px`);
    root.style.setProperty("--reveal-y", `${y}px`);
    root.style.setProperty("--reveal-r", `${Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))}px`);
    root.classList.add("theme-switching");
    const t = document.startViewTransition(() => apply(next));
    t.finished.finally(() => root.classList.remove("theme-switching"));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme ? `Switch to ${next} theme` : "Switch theme"}
      title={theme ? `Switch to ${next} theme` : undefined}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full border bg-surface text-foreground transition-[background-color,border-color,color] duration-200 hover:border-primary hover:text-primary-text"
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <g className="theme-icon-sun">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
        </g>
        <path className="theme-icon-moon" d="M20 14.2A8 8 0 0 1 9.8 4a8 8 0 1 0 10.2 10.2Z" />
      </svg>
    </button>
  );
}
