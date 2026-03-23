import type { ButtonHTMLAttributes } from "react";
import { Button } from "@/components/ui/button";
type RecordAction = "add" | "update" | "delete";

function ActionIcon({ action }: { action: RecordAction }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true
  };

  if (action === "add") {
    return (
      <svg {...common}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    );
  }

  if (action === "update") {
    return (
      <svg {...common}>
        <path d="M3 21h6" />
        <path d="M4.5 16.5L16 5l3 3L7.5 19.5 4 20z" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="M7 7l1 13h8l1-13" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export default function RecordActionButton({
  action,
  label,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  action: RecordAction;
  label: string;
}) {
  return (
    <Button
      className={["btn-outline", "record-action-btn", className].filter(Boolean).join(" ")}
      aria-label={label}
      title={label}
      {...rest}
    >
      <ActionIcon action={action} />
    </Button>
  );
}
