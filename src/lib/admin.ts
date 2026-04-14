"use client";

import { initializeApp, getApp, deleteApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const SECONDARY_NAME = "secondary";

function getSecondaryApp() {
  try {
    return getApp(SECONDARY_NAME);
  } catch {
    return initializeApp(firebaseConfig, SECONDARY_NAME);
  }
}

export type CreateRestaurantInput = {
  slug: string;
  name: string;
  address: string;
  phone: string;
  ownerEmail: string;
  ownerPassword: string;
  subscriptionExpiresAt: Date | null;
};

export type CreateRestaurantResult =
  | { ok: true; restaurantId: string; ownerUid: string }
  | { ok: false; error: string };

function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createRestaurantWithOwner(
  input: CreateRestaurantInput
): Promise<CreateRestaurantResult> {
  const slug = normalizeSlug(input.slug);
  if (!slug) return { ok: false, error: "Slug invalide" };

  // 1. Check slug unique
  const existing = await getDoc(doc(db, "restaurants", slug));
  if (existing.exists()) {
    return { ok: false, error: `Le slug « ${slug} » est déjà utilisé` };
  }

  // 2. Create auth user sur une instance secondaire (pour ne pas perdre la
  //    session superadmin courante).
  const secondaryApp = getSecondaryApp();
  const secondaryAuth = getAuth(secondaryApp);

  let ownerUid: string;
  try {
    const cred = await createUserWithEmailAndPassword(
      secondaryAuth,
      input.ownerEmail.trim(),
      input.ownerPassword
    );
    ownerUid = cred.user.uid;
  } catch (e) {
    await cleanupSecondary(secondaryApp);
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message.replace("Firebase: ", "")
          : "Impossible de créer l'utilisateur",
    };
  }

  // 3. Write restaurant doc + user doc
  try {
    await setDoc(doc(db, "restaurants", slug), {
      slug,
      name: input.name.trim(),
      address: input.address.trim(),
      phone: input.phone.trim(),
      active: true,
      subscriptionExpiresAt: input.subscriptionExpiresAt
        ? Timestamp.fromDate(input.subscriptionExpiresAt)
        : null,
      createdAt: serverTimestamp(),
    });

    await setDoc(doc(db, "users", ownerUid), {
      restaurantId: slug,
      role: "owner",
      email: input.ownerEmail.trim(),
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    await cleanupSecondary(secondaryApp);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Erreur Firestore",
    };
  }

  await cleanupSecondary(secondaryApp);
  return { ok: true, restaurantId: slug, ownerUid };
}

async function cleanupSecondary(app: ReturnType<typeof getSecondaryApp>) {
  try {
    await signOut(getAuth(app));
  } catch {
    /* ignore */
  }
  try {
    await deleteApp(app);
  } catch {
    /* ignore */
  }
}

export async function setRestaurantActive(
  restaurantId: string,
  active: boolean
) {
  await updateDoc(doc(db, "restaurants", restaurantId), { active });
}

export async function setRestaurantSubscription(
  restaurantId: string,
  date: Date | null
) {
  await updateDoc(doc(db, "restaurants", restaurantId), {
    subscriptionExpiresAt: date ? Timestamp.fromDate(date) : null,
  });
}

export async function updateRestaurantInfo(
  restaurantId: string,
  payload: { name: string; address: string; phone: string }
) {
  await updateDoc(doc(db, "restaurants", restaurantId), {
    name: payload.name.trim(),
    address: payload.address.trim(),
    phone: payload.phone.trim(),
  });
}

export async function deleteRestaurantAndSubcollections(
  restaurantId: string
): Promise<void> {
  // Supprime toutes les sous-collections puis le doc restaurant.
  // Ne supprime PAS le compte Firebase Auth de l'owner (impossible depuis le
  // client SDK). Il faudra le supprimer manuellement dans la console Firebase.
  const subcollections = ["categories", "products", "orders"];
  for (const name of subcollections) {
    const snap = await getDocs(
      collection(db, "restaurants", restaurantId, name)
    );
    const chunks: typeof snap.docs[] = [];
    for (let i = 0; i < snap.docs.length; i += 400) {
      chunks.push(snap.docs.slice(i, i + 400));
    }
    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
  // Supprime les docs users liés à ce restaurant
  const usersSnap = await getDocs(collection(db, "users"));
  const batch = writeBatch(db);
  usersSnap.docs.forEach((d) => {
    const data = d.data() as { restaurantId?: string; role?: string };
    if (data.restaurantId === restaurantId && data.role !== "superadmin") {
      batch.delete(d.ref);
    }
  });
  await batch.commit();

  await deleteDoc(doc(db, "restaurants", restaurantId));
}
