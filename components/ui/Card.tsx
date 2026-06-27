import { ComponentProps } from "react";

/**
 * Card / border treatment mirrored from OLOS:
 *   rounded-lg border border-whisper bg-white/[0.02] p-8
 */
export function Card({
  className = "",
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={`rounded-lg border border-whisper bg-white/[0.02] p-8 ${className}`}
      {...props}
    />
  );
}
