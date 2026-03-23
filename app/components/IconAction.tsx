"use client";

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

type IconActionProps = {
  icon: LucideIcon;
  label: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: "ghost" | "outline" | "destructive";
  disabled?: boolean;
  className?: string;
  size?: "sm" | "default";
};

export default function IconAction({
  icon: Icon,
  label,
  onClick,
  variant = "ghost",
  disabled = false,
  className,
  size = "default",
}: IconActionProps) {
  const btnSize = size === "sm" ? "icon-sm" : "icon";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size={btnSize}
          aria-label={label}
          onClick={onClick}
          disabled={disabled}
          className={className}
          style={{ minHeight: 44, minWidth: 44 }}
        >
          <Icon style={{ width: 16, height: 16 }} aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
