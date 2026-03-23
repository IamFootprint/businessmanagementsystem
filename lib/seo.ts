import type { Metadata } from "next";

export const SITE_URL = "https://cycledesk.co.za";

export const DEFAULT_META_DESCRIPTION =
  "CycleDesk helps bike service shops manage bookings, job cards, customers, and workshop workflow — from intake to invoicing — in one simple web app.";

export const DEFAULT_META_TITLE = "CycleDesk | Workshop software for bike service shops";
export const DEFAULT_OG_TITLE = "CycleDesk — Bike workshop management software";
export const DEFAULT_OG_IMAGE = "/og/og-cycledesk.jpg";

export function buildPageMetadata(input: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical: input.path
    },
    openGraph: {
      title: input.title,
      description: input.description,
      url: input.path,
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: "CycleDesk bike workshop software overview"
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [DEFAULT_OG_IMAGE]
    }
  };
}
