import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server-auth";
import { createHmac } from "crypto";

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME!;
const API_KEY = process.env.CLOUDINARY_API_KEY!;
const API_SECRET = process.env.CLOUDINARY_API_SECRET!;

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const rawFolder = (formData.get("folder") as string) || "products";
  const folder = rawFolder.replace(/[^a-zA-Z0-9_\-\/]/g, "").slice(0, 100);

  if (!file || !file.type.startsWith("image/")) {
    return NextResponse.json(
      { ok: false, error: "Fichier image requis" },
      { status: 400 },
    );
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json(
      { ok: false, error: "Image trop volumineuse (max 10 Mo)" },
      { status: 400 },
    );
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = createHmac("sha256", API_SECRET)
    .update(paramsToSign)
    .digest("hex");

  const cloudForm = new FormData();
  cloudForm.append("file", file);
  cloudForm.append("folder", folder);
  cloudForm.append("timestamp", timestamp);
  cloudForm.append("api_key", API_KEY);
  cloudForm.append("signature", signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: cloudForm },
  );

  const data = await res.json();

  if (!res.ok || data.error) {
    console.error("[Cloudinary] Upload error:", data.error || data);
    return NextResponse.json(
      { ok: false, error: data.error?.message || "Erreur upload image" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    url: data.secure_url,
    publicId: data.public_id,
  });
}
