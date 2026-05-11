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
      return;
    }
    const { role: r, restaurant: rest } = await loadProfile(u.id);
    setRole(r);
    setRestaurant(rest);
  }, []);

  useEffect(() => {
    let mounted = true;

    // Filet de sécurité : si tout échoue, on débloque loading après 5s
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
        await refresh(data.session?.user ?? null);
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
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
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
  }, []);

  return (
    <Ctx.Provider value={{ user, restaurant, role, loading, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
