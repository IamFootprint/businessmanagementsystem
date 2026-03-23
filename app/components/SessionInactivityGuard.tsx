"use client";

import InactivityTimeoutModal from "./InactivityTimeoutModal";
import { useInactivityLogout } from "@/src/lib/security/useInactivityLogout";

export default function SessionInactivityGuard() {
  const { countdownOpen, countdownSecondsLeft, staySignedIn, logoutNow } = useInactivityLogout();

  return (
    <InactivityTimeoutModal
      open={countdownOpen}
      secondsLeft={countdownSecondsLeft}
      onStaySignedIn={staySignedIn}
      onLogoutNow={() => {
        void logoutNow();
      }}
    />
  );
}
