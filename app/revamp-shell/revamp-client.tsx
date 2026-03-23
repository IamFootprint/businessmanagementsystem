"use client";

import dynamic from "next/dynamic";

const RevampApp = dynamic(() => import("@/revamp/App"), {
  ssr: false,
});

export default function RevampClient() {
  return <RevampApp />;
}
