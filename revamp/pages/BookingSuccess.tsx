import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Calendar, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/revamp/components/ui/button";
import { formatDateTimeLongZA } from "@/revamp/lib/formatters";

export default function BookingSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingRef = searchParams.get("ref") || "—";
  const slot = searchParams.get("slot");
  const address = searchParams.get("address") || "—";

  const slotLabel = useMemo(() => {
    if (!slot) return "Slot to be confirmed";
    return formatDateTimeLongZA(slot);
  }, [slot]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-status-completed/15 flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-status-completed" />
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Booking Confirmed!</h1>
        <p className="text-muted-foreground mb-6">Your mechanic has been notified and will arrive at the scheduled time.</p>

        <div className="panel-padded text-left space-y-3 mb-6">
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground font-medium">{slotLabel}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground font-medium">{address}</span>
          </div>
          <div className="pt-2 border-t border-border flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Booking ref</span>
            <span className="text-sm font-bold font-mono text-foreground">{bookingRef}</span>
          </div>
        </div>

        <div className="space-y-3">
          <Button className="w-full" size="lg" onClick={() => navigate("/app/bookings")}>
            Track Booking <ArrowRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="lg" className="w-full" onClick={() => navigate("/app")}>
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
