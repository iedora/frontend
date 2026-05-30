import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * Bottom-pinned action bar — always reachable on a phone, sticks under
 * everything else on desktop. Replaces the `fixed inset-x-0 bottom-0
 * ... safe-area-inset-bottom` block that was copy-pasted into every
 * mobile-first wizard (transfer, payments-admin).
 *
 * Mobile-first contract:
 *   - Full-width, single primary action (the children).
 *   - Padding picks up the iPhone home-indicator inset.
 *   - Sits ABOVE the dashboard sidebar on `lg+`: the sidebar takes
 *     288px on desktop (`var(--ds-sidebar-w)`), the bar offsets its
 *     left edge to start AFTER the sidebar. If your surface has no
 *     sidebar, pass `inset="full"`.
 */
export function StickyCTA({
  inset = "sidebar",
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  /** `sidebar` (default): offset by the dashboard sidebar on lg+. `full`: edge to edge. */
  inset?: "sidebar" | "full";
  children: ReactNode;
}) {
  return (
    <div
      {...rest}
      className={cn(
        "ds-sticky-cta",
        inset === "sidebar" && "ds-sticky-cta--sidebar",
        className,
      )}
    >
      {children}
    </div>
  );
}
