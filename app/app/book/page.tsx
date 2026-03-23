import { Button } from "@/components/ui/button";
import { ServiceItemsRepo } from "@/src/lib/store";
export default async function AppBookPage() {
  const services = await ServiceItemsRepo.listActive();

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h1 className="font-display font-bold text-foreground text-lg mb-1">Book a Service</h1>
      <p className="text-sm text-muted-foreground mb-4">Select a service to start your guided booking flow.</p>
      <div className="flex flex-col gap-3">
        {services.length === 0 ? <p className="text-sm text-muted-foreground">No active services available yet.</p> : null}
        {services.map((service) => (
          <div key={service.id} className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors">
            <div className="space-y-0.5">
              <strong className="text-sm font-semibold text-foreground">{service.name}</strong>
              <div className="text-sm text-muted-foreground">{service.description || "Service package"}</div>
              <div className="text-xs text-muted-foreground">
                {(service.basePriceCents / 100).toFixed(0)} ZAR &bull; {service.durationMins} mins
              </div>
            </div>
            <a href={`/book/details?itemType=service&itemId=${encodeURIComponent(service.id)}`}>
              <Button size="sm">Continue</Button>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
