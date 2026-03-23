import OtpVerifyClient from "./client";

export default function OtpVerifyPage({
  searchParams,
}: {
  searchParams: { returnTo?: string };
}) {
  return <OtpVerifyClient returnTo={searchParams.returnTo || "/"} />;
}
