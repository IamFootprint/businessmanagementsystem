import Link from "next/link";
import FadeIn from "./FadeIn";

interface CTASectionProps {
  headline: string;
  text?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

export default function CTASection({
  headline,
  text,
  primaryLabel = "Start free trial",
  primaryHref = "/partner/signup",
  secondaryLabel = "Get in touch",
  secondaryHref = "/contact",
}: CTASectionProps) {
  return (
    <section className="marketing-cta-section">
      <div className="marketing-container">
        <FadeIn>
          <h2 className="marketing-cta-headline">{headline}</h2>
          {text ? <p className="marketing-cta-text">{text}</p> : null}
          <div className="marketing-cta-buttons">
            <Link href={primaryHref} className="marketing-btn-primary">{primaryLabel}</Link>
            <Link href={secondaryHref} className="marketing-btn-secondary">{secondaryLabel}</Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
