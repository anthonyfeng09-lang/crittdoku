import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";

/* A spotlight coach-mark overlay. Dims the whole screen except a rounded
 * cutout around the target element, points a callout at it, and either shows
 * a Next button or waits for the target to be used. The cutout animates
 * smoothly between steps. Always has a Skip. */

export interface CoachStep {
  /** CSS selector for the element to spotlight; omit for a centred message */
  target?: string;
  title: string;
  body: string;
  /** where the callout sits relative to the target */
  place?: "top" | "bottom" | "left" | "right" | "center" | "auto";
  /** let clicks through to the spotlighted element */
  interact?: boolean;
  /** if set, the step auto-advances once this returns true (polled) */
  until?: () => boolean;
  /** hide the Next button (used with `until`) */
  noNext?: boolean;
  /** extra padding around the cutout, px */
  pad?: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function Coach({
  steps,
  index,
  onNext,
  onSkip,
}: {
  steps: CoachStep[];
  index: number;
  onNext: () => void;
  onSkip: () => void;
}) {
  const step = steps[index];
  const targetSel = step?.target ?? "";
  const [rect, setRect] = useState<Rect | null>(null);
  const raf = useRef<number>();

  // track the target's position every frame (it may animate / scroll)
  useLayoutEffect(() => {
    let alive = true;
    const tick = () => {
      if (!alive) return;
      if (step?.target) {
        const el = document.querySelector(step.target) as HTMLElement | null;
        if (el) {
          const b = el.getBoundingClientRect();
          setRect({ x: b.left, y: b.top, w: b.width, h: b.height });
        } else {
          setRect(null);
        }
      } else {
        setRect(null);
      }
      raf.current = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      alive = false;
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetSel, index]);

  // auto-advance once when the step's condition is met
  const firedFor = useRef(-1);
  useEffect(() => {
    const until = steps[index]?.until;
    if (!until) return;
    const id = setInterval(() => {
      if (firedFor.current !== index && until()) {
        firedFor.current = index;
        clearInterval(id);
        onNext();
      }
    }, 160);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Esc skips
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onSkip();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onSkip]);

  if (!step) return null;

  const pad = step.pad ?? 10;
  const hole =
    rect && step.target
      ? {
          x: rect.x - pad,
          y: rect.y - pad,
          w: rect.w + pad * 2,
          h: rect.h + pad * 2,
        }
      : null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // place the callout
  const place = step.place ?? (hole ? "auto" : "center");
  const POP = 340;
  const clampX = (x: number) => Math.min(Math.max(x, 180), vw - 180);
  const clampY = (y: number) => Math.min(Math.max(y, 120), vh - 120);
  let cx = vw / 2;
  let cy = vh / 2;
  let anchor: "top" | "bottom" | "center" = "center";
  const POPH = 210; // rough callout height for clamping
  if (hole && place !== "center") {
    const midX = hole.x + hole.w / 2;
    const below = hole.y + hole.h + 18;
    const above = hole.y - 18;
    const roomRight = vw - (hole.x + hole.w) > POP + 40;
    const roomLeft = hole.x > POP + 40;
    const roomBelow = vh - below > POPH;
    const roomAbove = above > POPH;
    let side = place;
    if (side === "left" && !roomLeft) side = roomRight ? "right" : "auto";
    if (side === "right" && !roomRight) side = roomLeft ? "left" : "auto";
    if (side === "top" && !roomAbove) side = "bottom";
    if (side === "bottom" && !roomBelow) side = roomAbove ? "top" : "auto";
    if (side === "right") {
      cx = clampX(hole.x + hole.w + 20 + POP / 2);
      cy = clampY(hole.y + hole.h / 2);
    } else if (side === "left") {
      cx = clampX(hole.x - 20 - POP / 2);
      cy = clampY(hole.y + hole.h / 2);
    } else if (side === "bottom" || (side === "auto" && roomBelow)) {
      cx = clampX(midX);
      cy = Math.min(below, vh - POPH);
      anchor = "top";
    } else if (side === "top" || (side === "auto" && roomAbove)) {
      cx = clampX(midX);
      cy = Math.max(above, POPH);
      anchor = "bottom";
    } else {
      // nowhere good: float centred, semi-transparent handled in CSS
      cx = clampX(midX);
      cy = clampY(vh / 2);
      anchor = "center";
    }
  }

  const last = index === steps.length - 1;

  // dark shade as four rects framing the hole, so the hole is a real gap that
  // clicks pass through. Each rect blocks clicks (so the player can only touch
  // the spotlighted element), unless the step is purely informational and
  // there's no hole.
  const swallow = (e: ReactMouseEvent) => e.stopPropagation();
  const shade = (s: CSSProperties, key: string) => (
    <div key={key} className="coach-shade" style={s} onClick={swallow} />
  );
  const frame = hole
    ? [
        shade({ left: 0, top: 0, width: vw, height: Math.max(0, hole.y) }, "n"),
        shade(
          { left: 0, top: hole.y + hole.h, width: vw, height: Math.max(0, vh - hole.y - hole.h) },
          "s",
        ),
        shade({ left: 0, top: hole.y, width: Math.max(0, hole.x), height: hole.h }, "w"),
        shade(
          { left: hole.x + hole.w, top: hole.y, width: Math.max(0, vw - hole.x - hole.w), height: hole.h },
          "e",
        ),
      ]
    : [shade({ inset: 0 }, "all")];

  return (
    <div className="coach" role="dialog" aria-label={step.title}>
      {frame}

      {/* on non-interactive steps the spotlighted control is shown but not
          yet clickable - an invisible blocker over the hole */}
      {hole && !step.interact && (
        <div
          className="coach-hole-block"
          style={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h }}
          onClick={swallow}
        />
      )}

      {hole && (
        <div
          className="coach-ring"
          style={{
            left: hole.x,
            top: hole.y,
            width: hole.w,
            height: hole.h,
          }}
        />
      )}

      <div
        className={`coach-pop coach-pop-${anchor}`}
        style={{
          left: cx,
          top: cy,
          transform:
            anchor === "top"
              ? "translate(-50%, 0)"
              : anchor === "bottom"
                ? "translate(-50%, -100%)"
                : "translate(-50%, -50%)",
        }}
      >
        <div className="coach-step-n">
          {index + 1} / {steps.length}
        </div>
        <h3>{step.title}</h3>
        <p>{step.body}</p>
        <div className="coach-actions">
          <button className="coach-skip" onClick={onSkip}>
            Skip
          </button>
          {!step.noNext && (
            <button className="coach-next" onClick={onNext}>
              {last ? "Play on" : "Next"}
            </button>
          )}
          {step.noNext && <span className="coach-wait">try it &rarr;</span>}
        </div>
      </div>
    </div>
  );
}
