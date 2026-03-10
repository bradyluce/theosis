import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-[8px] border px-4 py-2.5 text-sm font-medium tracking-[0.04em] transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "border-accent bg-accent text-white hover:bg-[#89671d] hover:border-[#89671d]",
        variant === "secondary" &&
          "border-line-strong bg-surface text-ink hover:bg-surface-strong",
        variant === "ghost" &&
          "border-transparent bg-transparent text-ink-muted hover:bg-surface hover:text-ink",
        className,
      )}
      {...props}
    />
  );
}
