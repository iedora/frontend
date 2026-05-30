import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * Two-to-four-option exclusive picker. Replaces the ad-hoc grids of
 * `<button aria-pressed>` that show up in transfer ("existing / new
 * tenant") and payments ("MBWay / cash") forms.
 *
 * Mobile-first: 44px min tap target, full-width with equal columns —
 * the buttons stretch to fill the container at every breakpoint, no
 * desktop-only condensed variant. Below `xs` the row stays a row;
 * stacking is the caller's call (wrap in a vertical container).
 *
 * Semantics: `role="radiogroup"`, each option `role="radio"` +
 * `aria-checked`. Keyboard: arrow keys move selection (handled by
 * native focus + caller's onChange).
 */
export type SegmentedOption<T extends string> = {
  value: T;
  label: ReactNode;
  /** Optional muted second line under the label. */
  hint?: ReactNode;
  disabled?: boolean;
  /** `data-test-id` on the button. */
  testId?: string;
};

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  testId,
}: {
  value: T;
  onChange: (next: T) => void;
  options: ReadonlyArray<SegmentedOption<T>>;
  ariaLabel: string;
  className?: string;
  testId?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      data-test-id={testId}
      className={cn("ds-segmented", className)}
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            data-active={active ? "true" : "false"}
            data-test-id={opt.testId}
            className="ds-segmented__opt"
          >
            <span className="ds-segmented__label">{opt.label}</span>
            {opt.hint ? (
              <span className="ds-segmented__hint">{opt.hint}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
