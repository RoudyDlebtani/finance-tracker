import { getCategories } from "@/lib/data";
import { CategoriesView } from "@/components/categories-view";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await getCategories();
  return <CategoriesView categories={categories} />;
}
