"use client";

import { supabase } from "./supabase";

const BUCKET = "products";

export async function uploadProductImage(
  restaurantId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const fileName = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;
  const path = `${restaurantId}/${fileName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteProductImage(url: string): Promise<void> {
  if (!url) return;
  try {
    // Extract path from public URL
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return;
    const path = decodeURIComponent(url.substring(idx + marker.length));
    await supabase.storage.from(BUCKET).remove([path]);
  } catch {
    // Silent: image may be gone or URL is external
  }
}

export async function uploadLogo(
  restaurantId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${restaurantId}/logo.${ext}`;

  const { error } = await supabase.storage
    .from("logos")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from("logos").getPublicUrl(path);
  // Cache-bust
  return `${data.publicUrl}?v=${Date.now()}`;
}
