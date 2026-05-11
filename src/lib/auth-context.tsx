"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase } from "./supabase";
import { User } from "@supabase/supabase-js";
import { Restaurant, RestaurantRow, mapRestaurant } from "@/types";

export type UserRole = "owner" | "superadmin";

type AuthCtx = {
  user: User | null;
  restaurant: Restaurant | null;
  role: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  restaurant: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

// ----- Cache localStorage -----
// Quand l'utilisateur revient sur l'app après une pause, on affiche
// immédiatement ce qui était en cache, puis on rafraîchit en arrière-plan.
// Plus de freeze "Chargement..." pendant 5-10s à cause du cold start Vercel.

const CACHE_KEY = "resto-saas:auth-v1";
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

type AuthCache = {
  userId: string;
  role: UserRole;
  restaurant: Restaurant | null;
  ts: number;
};

function readCache(): AuthCache | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthCache;
    if (Date.now() - parsed.ts > CACHE_MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(data: AuthCache) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // quota / mode privé : on ignore
  }
}

function clearCache() {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

async function loadProfile(userId: string): Promise<{
  role: UserRole | null;
  restaurant: Restaurant | null;
}> {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, restaurant_id")
      .eq("id", userId)
      .maybeSingle();

    if (!profile) return { role: null, restaurant: null };

    const role = profile.role as UserRole;
    if (role === "superadmin" || !profile.restaurant_id) {
      return { role, restaurant: null };
    }

    const { data: rest } = await supabase
      .from("restaurants")
      .select("*")
      .eq("id", profile.restaurant_id)
      .maybeSingle();

    return {
      role,
      restaurant: rest ? mapRestaurant(rest as RestaurantRow) : null,
    };
  } catch (e) {
    console.warn("[auth] loadProfile failed:", e);
    return { role: null, restaurant: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (u: User | null) => {
    setUser(u);
    if (!u) {
      setRole(null);
      setRestaurant(null);
      clearCache();
      return;
    }
    const { role: r, restaurant: rest } = await loadProfile(u.id);
    setRole(r);
    setRestaurant(rest);
    if (r) {
      writeCache({ userId: u.id, role: r, restaurant: rest, ts: Date.now() });
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Filet : si tout échoue, on débloque loading après 5s
    const failsafe = setTimeout(() => {
      if (mounted) {
        console.warn("[auth] init timeout, forcing loading=false");
        setLoading(false);
      }
    }, 5000);

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;

        const sessionUser = data.session?.user ?? null;

        // Hot path : on a une session ET un cache valide pour ce user
        // → on affiche tout de suite, puis on refresh en silence.
        if (sessionUser) {
          const cache = readCache();
          if (cache && cache.userId === sessionUser.id) {
            setUser(sessionUser);
            setRole(cache.role);
            setRestaurant(cache.restaurant);
            setLoading(false);
            clearTimeout(failsafe);
            // Refresh en background (silencieux)
            void refresh(sessionUser);
            return;
          }
        }

        await refresh(sessionUser);
      } catch (e) {
        console.error("[auth] getSession failed:", e);
      } finally {
        if (mounted) {
          clearTimeout(failsafe);
          setLoading(false);
        }
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      // On ignore TOKEN_REFRESHED qui se déclenche en boucle et ne change rien.
      if (event === "TOKEN_REFRESHED") return;
      try {
        await refresh(session?.user ?? null);
      } catch (e) {
        console.error("[auth] onAuthStateChange refresh failed:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    });

    // Quand l'utilisateur revient sur l'onglet, on refresh silencieusement
    // ses données (au cas où elles auraient changé pendant son absence).
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) void refresh(data.session.user);
      });
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      mounted = false;
      clearTimeout(failsafe);
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setRestaurant(null);
    clearCache();
  }, []);

  return (
    <Ctx.Provider value={{ user, restaurant, role, loading, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
