import { useNavigate } from "react-router-dom";
import logo from "@/revamp/assets/cycledesk-logo.png";
import heroBike from "@/revamp/assets/hero-bike.jpg";
import { Button } from "@/revamp/components/ui/button";

export default function Splash() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={heroBike.src} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/95 via-foreground/50 to-foreground/20" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <img src={logo.src} alt="CycleDesk" className="h-12 mx-auto mb-8" />
          <h1 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground leading-tight mb-3">
            Professional bike service,<br />
            <span className="text-accent">at your door.</span>
          </h1>
          <p className="text-primary-foreground/70 text-base mb-8 max-w-sm mx-auto">
            Book trusted mechanics, track your service in real-time, and keep your bikes in peak condition.
          </p>
          <div className="space-y-3">
            <Button size="lg" className="w-full" onClick={() => navigate("/login")}>
              Get Started
            </Button>
            <Button variant="ghost" size="lg" className="w-full text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate("/login")}>
              I already have an account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
