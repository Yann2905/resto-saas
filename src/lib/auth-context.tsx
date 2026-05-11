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
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, restaurant_id")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) {
    return { role: null, restaurant: null };
  }

  const role = profile.role as UserRole;
  if (role === "superadmin" || !profile.restaurant_id) {
    return { role, restaurant: null };
  }

  const { data: rest, error: restError } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", profile.restaurant_id)
    .maybeSingle();

  if (restError || !rest) {
    return { role, restaurant: null };
  }
  return { role, restaurant: mapRestaurant(rest as RestaurantRow) };
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

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      await refresh(data.session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      await refresh(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
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
