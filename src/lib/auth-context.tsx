"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { Restaurant } from "@/types";

export type UserRole = "owner" | "superadmin";

type AuthCtx = {
  user: User | null;
  restaurant: Restaurant | null;
  role: UserRole | null;
  loading: boolean;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  restaurant: null,
  role: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const memberDoc = await getDoc(doc(db, "users", u.uid));
        if (memberDoc.exists()) {
          const data = memberDoc.data() as {
            restaurantId?: string;
            role?: UserRole;
          };
          setRole(data.role ?? "owner");
          if (data.role === "superadmin") {
            setRestaurant(null);
          } else if (data.restaurantId) {
            const restDoc = await getDoc(
              doc(db, "restaurants", data.restaurantId)
            );
            if (restDoc.exists()) {
              setRestaurant({
                id: restDoc.id,
                ...(restDoc.data() as Omit<Restaurant, "id">),
              });
            }
          }
        } else {
          setRole(null);
          setRestaurant(null);
        }
      } else {
        setRestaurant(null);
        setRole(null);
      }
      setLoading(false);
    });
  }, []);

  return (
    <Ctx.Provider value={{ user, restaurant, role, loading }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
