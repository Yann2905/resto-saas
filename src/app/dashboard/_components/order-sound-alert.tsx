"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { alertLowStock } from "@/lib/swal";

let audioCtx: AudioContext | null = null;
let audioUnlocked = false;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    audioCtx = new AC();
  }
  return audioCtx;
}

function unlockAudio() {
  if (audioUnlocked) return;
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.01);
    audioUnlocked = true;
  } catch {
    /* ignore */
  }
}

// Fallback: jouer un bip via un élément Audio (data URI) quand AudioContext est bloqué
function playFallbackBeep() {
  try {
    // Génère un WAV PCM très court (bip 880Hz, 200ms, 8kHz sample rate)
    const sampleRate = 8000;
    const duration = 0.3;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + numSamples);
    const view = new DataView(buffer);
    // WAV header
    const writeStr = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeStr(0, "RIFF");
    view.setUint32(4, 36 + numSamples, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate, true);
    view.setUint16(32, 1, true);
    view.setUint16(34, 8, true); // 8 bits
    writeStr(36, "data");
    view.setUint32(40, numSamples, true);
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const val = Math.sin(2 * Math.PI * 880 * t) * 0.5;
      view.setUint8(44 + i, Math.floor((val + 1) * 127.5));
    }
    const blob = new Blob([buffer], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.volume = 0.8;
    audio.play().then(() => {
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }).catch(() => {
      URL.revokeObjectURL(url);
    });
  } catch {
    /* dernier recours échoué */
  }
}

export function playChime(orderType?: "food" | "service" | "issue") {
  try {
    const ctx = getAudioContext();

    // Tenter de réveiller l'AudioContext
    if (ctx.state === "suspended") {
      void ctx.resume().then(() => {
        playChimeInternal(orderType);
      }).catch(() => {
        playFallbackBeep();
      });
      // En parallèle, essayer le fallback audio element
      playFallbackBeep();
      return;
    }

    playChimeInternal(orderType);
  } catch (e) {
    console.warn("[chime] échec lecture audio:", e);
    playFallbackBeep();
  }
}

function playChimeInternal(orderType?: "food" | "service" | "issue") {
  if (!audioCtx || audioCtx.state !== "running") return;

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
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      void ctx.resume().then(() => {
        if (audioCtx && audioCtx.state === "running") {
          playWarningInternal();
        }
      });
      playFallbackBeep();
      return;
    }
    playWarningInternal();
  } catch (e) {
    console.warn("[warning-chime] échec lecture audio:", e);
    playFallbackBeep();
  }
}

function playWarningInternal() {
  if (!audioCtx || audioCtx.state !== "running") return;
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
}

async function tryNotify(tableNumber: number, total: number, roomLabel?: string) {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const location = roomLabel ? `Chambre ${roomLabel}` : tableNumber ? `Table ${tableNumber}` : "Nouvelle commande";
    const title = `Nouvelle commande · ${location}`;
    const body = total > 0 ? `Total : ${total.toLocaleString("fr-FR")} FCFA` : "";

    // Préférer la notification via le Service Worker (fonctionne en arrière-plan)
    if ("serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title, {
          body,
          icon: "/icon-192.png",
          badge: "/favicon-32.png",
          tag: "new-order",
          renotify: true,
          requireInteraction: true,
          data: { url: "/dashboard/orders" },
          // vibrate n'est pas dans le type TS mais supporté par les navigateurs
          ...(({ vibrate: [200, 100, 200, 100, 200] }) as NotificationOptions),
        } as NotificationOptions);
        return; // succès via SW
      } catch {
        // fallback vers Notification API directe
      }
    }

    // Fallback: Notification API directe (ne fonctionne que fenêtre au premier plan)
    new Notification(title, {
      body,
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
    // Demander la permission de notification si pas encore fait
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission();
    }
    // S'abonner aux push notifications
    subscribeToPush();
  }, []);

  // Utiliser des refs pour éviter les closures périmées dans les abonnements Realtime
  const thresholdRef = useRef(10);
  useEffect(() => {
    thresholdRef.current = restaurant?.lowStockThreshold ?? 10;
  }, [restaurant?.lowStockThreshold]);

  // Ré-unlock audio à chaque interaction (pas { once: true } car le navigateur
  // peut re-suspendre l'AudioContext quand l'onglet passe en arrière-plan)
  useEffect(() => {
    const handler = () => {
      unlockAudio();
      // Tenter de réactiver si suspendu
      if (audioCtx && audioCtx.state === "suspended") {
        void audioCtx.resume();
      }
    };
    window.addEventListener("click", handler);
    window.addEventListener("keydown", handler);
    window.addEventListener("touchstart", handler);

    // Vérifier périodiquement l'état de l'AudioContext et tenter de le réactiver
    const interval = setInterval(() => {
      if (audioCtx && audioCtx.state === "suspended") {
        void audioCtx.resume().catch(() => {});
      }
    }, 10_000); // toutes les 10 secondes

    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("touchstart", handler);
      clearInterval(interval);
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
          const oldProd = payload.old as { stock_quantity?: number | null } | null;
          const newProd = payload.new as { id: string; name: string; stock_quantity: number | null };

          const threshold = thresholdRef.current;
          const oldStock = oldProd?.stock_quantity;
          const newStock = newProd.stock_quantity;
          const pId = newProd.id;

          if (newStock === null) return; // pas de suivi de stock
          if (newStock <= threshold) {
            let shouldAlert = false;
            if (oldStock !== undefined && oldStock !== null) {
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

    const categoryChannel = supabase
      .channel(`global-categories-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "categories",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const oldCat = payload.old as { stock?: number | null } | null;
          const newCat = payload.new as { id: string; name: string; stock: number | null };

          if (newCat.stock === null) return;
          const threshold = thresholdRef.current;
          const oldStock = oldCat?.stock;
          const newStock = newCat.stock;
          const cId = `cat-${newCat.id}`;

          if (newStock <= threshold) {
            let shouldAlert = false;
            if (oldStock !== undefined && oldStock !== null) {
              shouldAlert = oldStock > threshold;
            } else {
              shouldAlert = !alertedProducts.current.has(cId);
            }

            if (shouldAlert) {
              alertedProducts.current.add(cId);
              playWarningChime();
              void alertLowStock(`Catégorie ${newCat.name}`, newStock);
            }
          } else {
            alertedProducts.current.delete(cId);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(productChannel);
      supabase.removeChannel(categoryChannel);
    };
  }, [restaurantId]);

  return null;
}
