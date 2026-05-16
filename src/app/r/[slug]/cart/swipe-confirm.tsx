"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";

type Props = {
  onConfirm: () => void;
  label?: string;
  hint?: string;
  loading?: boolean;
  disabled?: boolean;
};

const THUMB_SIZE = 56;       // px
const THRESHOLD = 0.85;      // 85% pour valider
const SPRING_MS = 350;

export default function SwipeConfirm({
  onConfirm,
  label = "Valider la commande",
  hint = "Glissez la flèche vers la droite pour valider",
  loading = false,
  disabled = false,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [maxSlide, setMaxSlide] = useState(0);
  const startX = useRef(0);

  // Calcul de la zone de glissement
  useEffect(() => {
    const update = () => {
      if (trackRef.current) {
        setMaxSlide(trackRef.current.offsetWidth - THUMB_SIZE - 8); // 8 = padding
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const progress = maxSlide > 0 ? Math.min(offsetX / maxSlide, 1) : 0;

  // ── Couleurs dynamiques ────────────────────────────────────
  // stone-900 → emerald-500 au fur et à mesure du slide
  const bgR = Math.round(12 + (16 - 12) * progress);
  const bgG = Math.round(10 + (185 - 10) * progress);
  const bgB = Math.round(9 + (129 - 9) * progress);
  const trackBg = confirmed
    ? "rgb(16, 185, 129)"
    : `rgb(${bgR}, ${bgG}, ${bgB})`;

  // ── Touch / Pointer handlers ───────────────────────────────
  const handleStart = useCallback(
    (clientX: number) => {
      if (disabled || loading || confirmed) return;
      startX.current = clientX;
      setDragging(true);
    },
    [disabled, loading, confirmed],
  );

  const handleMove = useCallback(
    (clientX: number) => {
      if (!dragging) return;
      const delta = Math.max(0, Math.min(clientX - startX.current, maxSlide));
      setOffsetX(delta);
    },
    [dragging, maxSlide],
  );

  const handleEnd = useCallback(() => {
    if (!dragging) return;
    setDragging(false);

    if (progress >= THRESHOLD) {
      // Snap to end
      setOffsetX(maxSlide);
      setConfirmed(true);
      // Haptic feedback si supporté
      if (navigator.vibrate) navigator.vibrate(30);
      setTimeout(() => onConfirm(), 300);
    } else {
      // Spring back
      setOffsetX(0);
    }
  }, [dragging, progress, maxSlide, onConfirm]);

  // Mouse events
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => handleMove(e.clientX);
    const onUp = () => handleEnd();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, handleMove, handleEnd]);

  return (
    <div className="space-y-2">
      {/* Track */}
      <div
        ref={trackRef}
        className="relative h-[64px] rounded-full p-1 overflow-hidden select-none"
        style={{
          backgroundColor: trackBg,
          transition: dragging ? "none" : `background-color ${SPRING_MS}ms ease`,
        }}
      >
        {/* Label au centre */}
        <span
          className="absolute inset-0 flex items-center justify-center text-white font-semibold text-sm tracking-wide pointer-events-none"
          style={{
            opacity: Math.max(0, 1 - progress * 2.5),
            transition: dragging ? "none" : `opacity ${SPRING_MS}ms ease`,
          }}
        >
          {loading ? "Envoi en cours..." : label}
        </span>

        {/* Checkmark au centre quand confirmé */}
        {confirmed && (
          <span className="absolute inset-0 flex items-center justify-center text-white pointer-events-none animate-fade-in-up">
            <Check className="w-6 h-6" strokeWidth={3} />
          </span>
        )}

        {/* Thumb */}
        <div
          className="absolute top-1 left-1 flex items-center justify-center rounded-full bg-white shadow-lg cursor-grab active:cursor-grabbing"
          style={{
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            transform: `translateX(${offsetX}px)`,
            transition: dragging ? "none" : `transform ${SPRING_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            handleStart(e.clientX);
          }}
          onTouchStart={(e) => handleStart(e.touches[0].clientX)}
          onTouchMove={(e) => handleMove(e.touches[0].clientX)}
          onTouchEnd={handleEnd}
        >
          {loading ? (
            <Loader2
              className="w-6 h-6 text-stone-900 animate-spin"
              strokeWidth={2.5}
            />
          ) : confirmed ? (
            <Check
              className="w-6 h-6 text-emerald-600"
              strokeWidth={2.5}
            />
          ) : (
            <ArrowRight
              className="w-6 h-6 text-stone-900"
              strokeWidth={2.5}
              style={{
                transform: `translateX(${progress * 4}px)`,
                transition: dragging ? "none" : `transform ${SPRING_MS}ms ease`,
              }}
            />
          )}
        </div>

        {/* Shimmer (indication visuelle de slide) */}
        {!dragging && !confirmed && !loading && (
          <div
            className="absolute top-0 left-0 h-full w-24 pointer-events-none"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
              animation: "swipe-shimmer 2.5s ease-in-out infinite",
            }}
          />
        )}
      </div>

      {/* Hint */}
      {!confirmed && (
        <p
          className="text-center text-xs text-stone-400 flex items-center justify-center gap-1.5"
          style={{
            opacity: loading ? 0 : 1,
            transition: `opacity ${SPRING_MS}ms ease`,
          }}
        >
          <span className="inline-block animate-bounce-right">→</span>
          {hint}
        </p>
      )}
    </div>
  );
}
