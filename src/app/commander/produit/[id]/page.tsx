import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { ProductRow, mapProduct } from "@/types";
import ProductDetail from "./product-detail";

export const revalidate = 60;

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: productRow } = await supabase
    .from("products")
    .select("id, name, price, image_url, description, category_id, restaurant_id, \"order\", available, stock_quantity, stock_consumption")
    .eq("id", id)
    .eq("available", true)
    .maybeSingle();

  if (!productRow) notFound();

  const product = mapProduct(productRow as ProductRow);

  const [{ data: restaurantRow }, { data: categoryRow }] = await Promise.all([
    supabase.from("restaurants").select("id, slug, name, logo_url, address, delivery_fee, estimated_delivery_minutes").eq("id", product.restaurantId).single(),
    supabase.from("categories").select("id, name").eq("id", product.categoryId).single(),
  ]);

  if (!restaurantRow) notFound();

  const { data: similarRows } = await supabase
    .from("products")
    .select("id, name, price, image_url, description, category_id, restaurant_id, \"order\", available, stock_quantity, stock_consumption")
    .eq("restaurant_id", product.restaurantId)
    .eq("category_id", product.categoryId)
    .eq("available", true)
    .neq("id", product.id)
    .order("order", { ascending: true })
    .limit(10);

  const similar = ((similarRows as ProductRow[]) ?? []).map((p) => {
    const mapped = mapProduct(p);
    return {
      id: mapped.id,
      name: mapped.name,
      price: mapped.price,
      imageUrl: mapped.imageUrl ?? null,
    };
  });

  return (
    <ProductDetail
      product={{
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl ?? null,
        description: product.description,
      }}
      restaurant={{
        id: restaurantRow.id,
        slug: restaurantRow.slug,
        name: restaurantRow.name,
        logoUrl: restaurantRow.logo_url ?? null,
        address: restaurantRow.address ?? null,
        deliveryFee: restaurantRow.delivery_fee ?? 0,
        estimatedDeliveryMinutes: restaurantRow.estimated_delivery_minutes ?? 30,
      }}
      categoryName={categoryRow?.name ?? "Autres"}
      similarProducts={similar}
    />
  );
}
