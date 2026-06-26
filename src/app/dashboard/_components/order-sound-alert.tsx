"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { alertLowStock } from "@/lib/swal";

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

export function playChime(orderType?: "food" | "service" | "issue") {
  try {
    if (!audioCtx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") void audioCtx.resume();

    if (orderType === "issue") {
      playAlarmSound();
    } else if (orderType === "service") {
      playBellSound();
    } else {
      playFoodChime();
    }

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(orderType === "issue" ? [300, 100, 300, 100, 300] : [200, 150, 200, 150, 200]);
    }
  } catch (e) {
    console.warn("[chime] échec lecture audio:", e);
  }
}

function playFoodChime() {
  for (let rep = 0; rep < 3; rep++) {
    [880, 1100].forEach((freq, i) => {
      const osc = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();
      osc.connect(gain);
      gain.connect(audioCtx!.destination);
      osc.frequency.value = freq;
      const t = audioCtx!.currentTime + rep * 0.8 + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.7, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  }
}

function playBellSound() {
  [660, 880, 1047].forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();
    osc.type = "sine";
    osc.connect(gain);
    gain.connect(audioCtx!.destination);
    osc.frequency.value = freq;
    const t = audioCtx!.currentTime + i * 0.25;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    osc.start(t);
    osc.stop(t + 0.6);
  });
}

function playAlarmSound() {
  for (let rep = 0; rep < 4; rep++) {
    const osc = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();
    osc.type = "square";
    osc.connect(gain);
    gain.connect(audioCtx!.destination);
    osc.frequency.value = rep % 2 === 0 ? 440 : 520;
    const t = audioCtx!.currentTime + rep * 0.3;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.4, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    osc.start(t);
    osc.stop(t + 0.25);
  }
}

export function playWarningChime() {
  try {
    if (!audioCtx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") void audioCtx.resume();
    // Deux bips plus graves et rythmés pour l'alerte
    [523.25, 523.25].forEach((freq, i) => {
      const osc = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();
      osc.connect(gain);
      gain.connect(audioCtx!.destination);
      osc.frequency.value = freq;
      const t = audioCtx!.currentTime + i * 0.25;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.3, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  } catch (e) {
    console.warn("[warning-chime] échec lecture audio:", e);
  }
}

function tryNotify(tableNumber: number, total: number, roomLabel?: string) {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const location = roomLabel ? `Chambre ${roomLabel}` : tableNumber ? `Table ${tableNumber}` : "Nouvelle commande";
    new Notification(`Nouvelle commande · ${location}`, {
      body: total > 0 ? `Total : ${total.toLocaleString("fr-FR")} FCFA` : "",
      icon: "/favicon.ico",
      tag: "new-order",
    });
  } catch {
    /* ignore */
  }
}

async function subscribeToPush() {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: existing.toJSON() }),
      });
      return;
    }
    const res = await fetch("/api/push/subscribe");
    const json = await res.json();
    if (!json.ok || !json.publicKey) return;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: json.publicKey,
    });
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });
  } catch (e) {
    console.warn("[push] subscribe failed:", e);
  }
}

export default function OrderSoundAlert() {
  const { restaurant } = useAuth();
  const knownIds = useRef<Set<string>>(new Set());
  const alertedProducts = useRef<Set<string>>(new Set());
  const initDone = useRef(false);

  useEffect(() => {
    subscribeToPush();
  }, []);

  // Utiliser des refs pour éviter les closures périmées dans les abonnements Realtime
  const thresholdRef = useRef(10);
  useEffect(() => {
    thresholdRef.current = restaurant?.lowStockThreshold ?? 10;
  }, [restaurant?.lowStockThreshold]);

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

    // 1. Écoute des nouvelles commandes
    const orderChannel = supabase
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
          const row = payload.new as { id: string; status: string; table_number: number; room_label?: string; order_type?: string; total: number };
          if (knownIds.current.has(row.id)) return;
          knownIds.current.add(row.id);
          if (row.status === "pending" && initDone.current) {
            playChime(row.order_type as "food" | "service" | "issue" | undefined);
            tryNotify(row.table_number, row.total, row.room_label);
          }
        },
      )
      .subscribe();

    // 2. Écoute des mises à jour de produits (pour l'alerte stock bas)
    const productChannel = supabase
      .channel(`global-products-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "products",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const oldProd = payload.old as { stock_quantity?: number } | null;
          const newProd = payload.new as { id: string; name: string; stock_quantity: number };

          const threshold = thresholdRef.current;
          const oldStock = oldProd?.stock_quantity;
          const newStock = newProd.stock_quantity;
          const pId = newProd.id;

          if (newStock <= threshold) {
            let shouldAlert = false;
            if (oldStock !== undefined) {
              // Si on a l'ancien stock (grâce à REPLICA IDENTITY FULL), on alerte
              // uniquement au moment du franchissement descendant du seuil.
              shouldAlert = oldStock > threshold;
            } else {
              // Fallback s'il manque l'ancienne valeur : on alerte si pas déjà signalé
              shouldAlert = !alertedProducts.current.has(pId);
            }

            if (shouldAlert) {
              alertedProducts.current.add(pId);
              playWarningChime();
              void alertLowStock(newProd.name, newStock);
            }
          } else {
            // Réinitialiser si le stock remonte au-dessus du seuil (ex: réapprovisionnement)
            alertedProducts.current.delete(pId);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(productChannel);
    };
  }, [restaurantId]);

  return null;
}
