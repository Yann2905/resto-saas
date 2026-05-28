"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

let audioCtx: AudioContext | null = null;
let audioUnlocked = false;

function unlockAudio() {
  if (audioUnlocked) return;
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    audioCtx = new AC();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    gain.gain.value = 0;
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.01);
    audioUnlocked = true;
  } catch {
    /* ignore */
  }
}

export function playChime() {
  try {
    if (!audioCtx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") void audioCtx.resume();
    [880, 1100].forEach((freq, i) => {
      const osc = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();
      osc.connect(gain);
      gain.connect(audioCtx!.destination);
      osc.frequency.value = freq;
      const t = audioCtx!.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  } catch (e) {
    console.warn("[chime] échec lecture audio:", e);
  }
}

function tryNotify(tableNumber: number, total: number) {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    new Notification(`Nouvelle commande · Table ${tableNumber}`, {
      body: `Total : ${total.toLocaleString("fr-FR")} FCFA`,
      icon: "/favicon.ico",
      tag: "new-order",
    });
  } catch {
    /* ignore */
  }
}

export default function OrderSoundAlert() {
  const { restaurant } = useAuth();
  const knownIds = useRef<Set<string>>(new Set());
  const initDone = useRef(false);

  useEffect(() => {
    const handler = () => unlockAudio();
    window.addEventListener("click", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("keydown", handler);
    };
  }, []);

  const restaurantId = restaurant?.id ?? null;

  useEffect(() => {
    if (!restaurantId) return;

    const loadKnownIds = async () => {
      try {
        const res = await fetch(`/api/orders?restaurantId=${restaurantId}`);
        const json = await res.json();
        if (json.ok) {
          const ids = (json.orders as { id: string }[]).map((o) => o.id);
          knownIds.current = new Set(ids);
        }
      } catch {
        /* ignore */
      }
      initDone.current = true;
    };

    loadKnownIds();

    const channel = supabase
      .channel(`global-orders-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const row = payload.new as { id: string; status: string; table_number: number; total: number };
          if (knownIds.current.has(row.id)) return;
          knownIds.current.add(row.id);
          if (row.status === "pending" && initDone.current) {
            playChime();
            tryNotify(row.table_number, row.total);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  return null;
}
