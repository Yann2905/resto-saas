"use client";

import { supabase } from "./supabase";

const BUCKET = "products";

// Redimensionne + compresse une image côté navigateur (Canvas).
// Une photo 5 Mo de smartphone passe à ~200 Ko avec une qualité visuellement
// identique : upload 10-20× plus rapide.
async function compressImage(
  file: File,
  maxDim = 1280,
  quality = 0.85
): Promise<Blob> {
  // Si l'image est déjà petite et légère, on ne perd pas de temps.
  if (file.size < 200 * 1024 && /\.(jpe?g|webp)$/i.test(file.name)) {
    return file;
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Image invalide"));
    i.src = dataUrl;
  });

  let { width, height } = img;
  if (width > height && width > maxDim) {
    height = Math.round((height * maxDim) / width);
    width = maxDim;
  } else if (height > maxDim) {
    width = Math.round((width * maxDim) / height);
    height = maxDim;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non supporté");
  ctx.drawImage(img, 0, 0, width, height);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Compression échouée"));
        resolve(blob);
      },
      "image/jpeg",
      quality
    );
  });
}

export async function uploadProductImage(
  restaurantId: string,
  file: File
): Promise<string> {
  const blob = await compressImage(file, 1280, 0.85);

  const fileName = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.jpg`;
  const path = `${restaurantId}/${fileName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteProductImage(url: string): Promise<void> {
  if (!url) return;
  try {
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return;
    const path = decodeURIComponent(url.substring(idx + marker.length));
    await supabase.storage.from(BUCKET).remove([path]);
  } catch {
    // silent
  }
}

export async function uploadLogo(
  restaurantId: string,
  file: File
): Promise<string> {
  // Logos : plus petit (max 512px) car ils s'affichent en miniature.
  const blob = await compressImage(file, 512, 0.9);
  const path = `${restaurantId}/logo.jpg`;

  const { error } = await supabase.storage
    .from("logos")
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from("logos").getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}
