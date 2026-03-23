import BookDetailsClient from "./client";

export default function BookDetailsPage({
  searchParams
}: {
  searchParams: { itemType?: string; itemId?: string; packageId?: string };
}) {
  const itemType = searchParams.itemType || (searchParams.packageId ? "package" : "");
  const itemId = searchParams.itemId || searchParams.packageId || "";
  return <BookDetailsClient itemType={itemType} itemId={itemId} />;
}
