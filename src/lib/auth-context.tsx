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

// Cache localStorage : restitution instantanée + survit aux refresh ratés
const CACHE_KEY = "resto-saas:auth-v1";
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

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
    // ignore
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

  // refresh : met à jour le state SEULEMENT si le fetch retourne des données.
  // Quand on a déjà des données en mémoire/cache, un fetch raté ne doit JAMAIS
  // les effacer (sinon retour d'onglet sur cold-start = "Chargement..." infini).
  const refresh = useCallback(async (u: User | null) => {
    if (!u) {
      setUser(null);
      setRole(null);
      setRestaurant(null);
      clearCache();
      return;
    }
    setUser(u);
    const { role: r, restaurant: rest } = await loadProfile(u.id);
    if (r) {
      setRole(r);
      setRestaurant(rest);
      writeCache({ userId: u.id, role: r, restaurant: rest, ts: Date.now() });
    }
    // Si r est null = échec/réseau. On garde silencieusement l'ancien state.
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

    // Première initialisation : tente d'utiliser le cache pour rendre instantanément
    const cachedSync = readCache();
    if (cachedSync) {
      setRole(cachedSync.role);
      setRestaurant(cachedSync.restaurant);
    }

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        const sessionUser = data.session?.user ?? null;

        if (sessionUser && cachedSync && cachedSync.userId === sessionUser.id) {
          // Hot path : cache valide → on rend tout de suite, refresh silencieux
          setUser(sessionUser);
          setLoading(false);
          clearTimeout(failsafe);
          void refresh(sessionUser);
          return;
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
      // Le TOKEN_REFRESHED se déclenche en boucle, ne change rien d'utile.
      if (event === "TOKEN_REFRESHED") return;
      // INITIAL_SESSION duplique le getSession qu'on a déjà fait.
      if (event === "INITIAL_SESSION") return;
      try {
        await refresh(session?.user ?? null);
      } catch (e) {
        console.error("[auth] onAuthStateChange refresh failed:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(failsafe);
      subscription.unsubscribe();
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
