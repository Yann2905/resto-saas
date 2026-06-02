"use client";

import { useEffect, useRef, useState } from "react";
import { Lock, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const SESSION_KEY = "resto-saas:pin-ok";

export default function PinGuard({ children }: { children: React.ReactNode }) {
  const { restaurant } = useAuth();
  const [verified, setVerified] = useState(false);
  const [pin, setPin] = useState(["", "", "", ""]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasPin, setHasPin] = useState(false);
  const [checking, setChecking] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!restaurant) return;

    const fetchPin = async () => {
      try {
        const res = await fetch(`/api/restaurant/pin?restaurantId=${restaurant.id}`);
        const data = await res.json();
        if (data.ok && data.hasPin) {
          setHasPin(true);
          const alreadyVerified = sessionStorage.getItem(SESSION_KEY) === restaurant.id;
          setVerified(alreadyVerified);
        } else {
          setVerified(true);
        }
      } catch {
        setVerified(true);
      }
      setLoading(false);
    };

    fetchPin();
  }, [restaurant]);

  const verifyPin = async (entered: string) => {
    if (!restaurant || checking) return;
    setChecking(true);
    try {
      const res = await fetch("/api/restaurant/pin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId: restaurant.id, pin: entered }),
      });
      const data = await res.json();
      if (data.ok && data.valid) {
        setVerified(true);
        sessionStorage.setItem(SESSION_KEY, restaurant.id);
      } else {
        setError(true);
        setPin(["", "", "", ""]);
        setTimeout(() => inputRefs.current[0]?.focus(), 150);
      }
    } catch {
      setError(true);
      setPin(["", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 150);
    }
    setChecking(false);
  };

  const handleDigit = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError(false);

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    if (index === 3 && value) {
      verifyPin(newPin.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (text.length === 4) {
      setPin(text.split(""));
      verifyPin(text);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50">
        <span className="w-5 h-5 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
      </main>
    );
  }

  if (verified) {
    return <>{children}</>;
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
      <div className="w-full max-w-xs animate-fade-in-up">
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xl shadow-stone-900/5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-stone-600" />
          </div>
          <h2 className="text-lg font-bold text-stone-900 mb-1">
            Accès protégé
          </h2>
          <p className="text-sm text-stone-500 mb-6">
            Entrez le code PIN à 4 chiffres pour accéder à cette section.
          </p>

          <div className="flex justify-center gap-3 mb-4" onPaste={handlePaste}>
            {pin.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                autoFocus={i === 0}
                disabled={checking}
                className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-stone-900/10 disabled:opacity-50 ${
                  error
                    ? "border-red-400 bg-red-50 text-red-700"
                    : "border-stone-300 bg-stone-50 text-stone-900 focus:border-stone-900"
                }`}
              />
            ))}
          </div>

          {checking && (
            <div className="flex items-center justify-center gap-2 text-sm text-stone-500">
              <span className="w-3.5 h-3.5 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
              Vérification…
            </div>
          )}

          {error && !checking && (
            <p className="text-sm text-red-600 flex items-center justify-center gap-1.5">
              <X className="w-4 h-4" /> Code incorrect
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
