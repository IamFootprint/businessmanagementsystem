import OtpRequestClient from "./client";

export default function OtpRequestPage({
  searchParams,
}: {
  searchParams: { returnTo?: string };
}) {
  return <OtpRequestClient returnTo={searchParams.returnTo || "/"} />;
}
