import Link from "next/link";
import { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold tracking-tight transition focus:outline-none focus-visible:ring-2 focus-visible:ring-aqua/60 disabled:opacity-50";

const variants: Record<Variant, string> = {
  // Primary button style: bg-teal ... rounded-md (per requirements §2)
  primary: "bg-teal text-midnight hover:bg-aqua shadow-sm shadow-teal/20",
  secondary:
    "border border-whisper bg-white/[0.03] text-cloud hover:bg-white/[0.06]",
  ghost: "text-cloud/70 hover:text-cloud",
};

type ButtonProps = {
  variant?: Variant;
  className?: string;
} & ComponentProps<"button">;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props} />
  );
}

type ButtonLinkProps = {
  variant?: Variant;
  className?: string;
} & ComponentProps<typeof Link>;

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={`${base} ${variants[variant]} ${className}`} {...props} />
  );
}
