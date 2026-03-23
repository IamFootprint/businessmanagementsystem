import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { apiFetch } from "@/lib/api";
import PublicHeroBanner from "@/app/components/PublicHeroBanner";
import Stepper from "../components/Stepper";
export const dynamic = "force-dynamic";

type CatalogItem = {
  id: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  priceCents: number;
};

type CatalogResponse = {
  packages: CatalogItem[];
  services: CatalogItem[];
};

export default async function BookStartPage({
  searchParams
}: {
  searchParams: { itemType?: string; itemId?: string; packageId?: string };
}) {
  if (searchParams.itemType && searchParams.itemId) {
    redirect(`/book/details?itemType=${searchParams.itemType}&itemId=${searchParams.itemId}`);
  }
  if (searchParams.packageId) {
    redirect(`/book/details?itemType=package&itemId=${searchParams.packageId}`);
  }

  const catalog = await apiFetch<CatalogResponse>("/api/public/catalog");

  return (
    <Container>
      <PublicHeroBanner
        eyebrow="Online Booking"
        title="Choose your service package"
        description="Start your booking by selecting a package or a single service."
      />
      <Stepper
        current={0}
        steps={["Select service", "Your details", "Choose slot", "Review", "Confirmation"]}
      />

      <h2 className="font-display font-bold text-foreground text-lg mb-3">Packages</h2>
      <div className="flex flex-col gap-3 mb-8">
        {catalog.packages.map((pkg) => (
          <div key={pkg.id} className="bg-card rounded-xl border border-border p-5 hover:bg-muted/50 transition-colors">
            <h3 className="font-semibold text-foreground">{pkg.name}</h3>
            <p className="text-sm text-muted-foreground">{pkg.description}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(pkg.priceCents / 100)} ZAR &bull; {pkg.durationMinutes} min
            </p>
            <a href={`/book/details?itemType=package&itemId=${pkg.id}`} className="mt-3 inline-block">
              <Button size="sm">Continue</Button>
            </a>
          </div>
        ))}
      </div>

      <h2 className="font-display font-bold text-foreground text-lg mb-3">Single services</h2>
      <div className="flex flex-col gap-3">
        {catalog.services.map((service) => (
          <div key={service.id} className="bg-card rounded-xl border border-border p-5 hover:bg-muted/50 transition-colors">
            <h3 className="font-semibold text-foreground">{service.name}</h3>
            <p className="text-sm text-muted-foreground">{service.description}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(service.priceCents / 100)} ZAR &bull; {service.durationMinutes} min
            </p>
            <a href={`/book/details?itemType=service&itemId=${service.id}`} className="mt-3 inline-block">
              <Button size="sm">Continue</Button>
            </a>
          </div>
        ))}
      </div>
    </Container>
  );
}
