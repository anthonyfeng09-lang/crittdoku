import { useEffect, useRef, useState } from "react";
import { LANGS } from "./i18n";

/* A small custom language picker. A native <select> dropdown can't be styled
 * (the OS draws the open list), so this is a button + our own popup. */

export function LangMenu({
  value,
  onChange,
}: {
  value: string;
  onChange: (lang: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const entries = Object.entries(LANGS);
  const current = LANGS[value] ?? LANGS.en;

  return (
    <div className="lang-menu" ref={box}>
      <button
        type="button"
        className="lang-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="language"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{current}</span>
        <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
          <path
            d="M2.5 4.5L6 8l3.5-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <ul className="lang-list" role="listbox">
          {entries.map(([code, name]) => (
            <li key={code} role="option" aria-selected={code === value}>
              <button
                type="button"
                className={code === value ? "on" : ""}
                onClick={() => {
                  onChange(code);
                  setOpen(false);
                }}
              >
                {name}
                {code === value && (
                  <svg viewBox="0 0 14 14" width="13" height="13" aria-hidden="true">
                    <path
                      d="M3 7.5L6 10.5L11.5 4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
