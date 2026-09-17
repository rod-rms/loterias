import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export interface ExportMenuProps {
  onExportCsv: () => void;
  onExportJson: () => void;
}

/** Groups the CSV/JSON export actions under a single "Exportar" control. Accessible via click/tap and Escape/outside-click to close. */
export function ExportMenu({ onExportCsv, onExportJson }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded border border-brand-border px-3 py-1.5 text-sm hover:bg-white/5"
      >
        Exportar
        <ChevronDown aria-hidden className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="menu" aria-label="Exportar jogos" className="absolute left-0 top-full z-20 mt-1 min-w-[9rem] rounded-md border border-brand-border bg-brand-surface py-1 shadow-lg">
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              onExportCsv();
              setOpen(false);
            }}
            className="block w-full px-3 py-2 text-left text-sm hover:bg-white/5"
          >
            CSV
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              onExportJson();
              setOpen(false);
            }}
            className="block w-full px-3 py-2 text-left text-sm hover:bg-white/5"
          >
            JSON
          </button>
        </div>
      )}
    </div>
  );
}
