"use client";

async function compressImage(
  file: File,
  maxDim = 1280,
  quality = 0.85
): Promise<Blob> {
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

async function uploadToCloudinary(file: File | Blob, folder: string): Promise<string> {
  const formData = new FormData();
  const blob = file instanceof File ? file : new File([file], "image.jpg", { type: "image/jpeg" });
  formData.append("file", blob);
  formData.append("folder", folder);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || "Erreur upload image");
  }
  return data.url;
}

export async function uploadProductImage(
  restaurantId: string,
  file: File
): Promise<string> {
  const blob = await compressImage(file, 1280, 0.85);
  return uploadToCloudinary(blob, `products/${restaurantId}`);
}

export async function deleteProductImage(_url: string): Promise<void> {
  // Cloudinary gère la suppression via le dashboard ou l'API admin.
  // Les images non-référencées n'impactent pas le quota significativement.
}

export async function uploadLogo(
  restaurantId: string,
  file: File
): Promise<string> {
  const blob = await compressImage(file, 512, 0.9);
  return uploadToCloudinary(blob, `logos/${restaurantId}`);
}
