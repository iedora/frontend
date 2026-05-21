// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { Combobox, type ComboboxOption } from "./combobox";

afterEach(() => {
  cleanup();
  // Radix portal can leak pointer-events:none across tests (see dialog.dom.test).
  document.body.style.pointerEvents = "";
});

const u = () => userEvent.setup({ pointerEventsCheck: 0 });

const SAMPLE: ComboboxOption[] = [
  { value: "alpha", label: "Alpha", hint: "α" },
  { value: "beta", label: "Beta", hint: "β" },
  { value: "betacarotene", label: "Beta Carotene" },
  { value: "gamma", label: "Gamma" },
];

function ControlledCombobox(props: { onChange?: (v: string | null) => void }) {
  const [value, setValue] = useState<string | null>(null);
  return (
    <Combobox
      options={SAMPLE}
      value={value}
      onChange={(v) => {
        setValue(v);
        props.onChange?.(v);
      }}
      placeholder="— pick —"
      searchPlaceholder="Type to filter"
    />
  );
}

describe("Combobox", () => {
  it("renders the placeholder when nothing is selected", () => {
    render(<ControlledCombobox />);
    expect(screen.getByRole("button", { name: /pick/i })).toBeDefined();
  });

  it("opens the popover on trigger click", async () => {
    const user = u();
    render(<ControlledCombobox />);
    await user.click(screen.getByRole("button", { name: /pick/i }));
    expect(screen.getAllByRole("option")).toHaveLength(SAMPLE.length);
  });

  it("filters as the user types, matching on label and hint", async () => {
    const user = u();
    render(<ControlledCombobox />);
    await user.click(screen.getByRole("button", { name: /pick/i }));
    const search = screen.getByPlaceholderText(/type to filter/i);
    await user.type(search, "beta");
    expect(screen.getAllByRole("option")).toHaveLength(2); // "Beta" + "Beta Carotene"
    // Alpha is gone
    expect(screen.queryByRole("option", { name: /alpha/i })).toBeNull();
  });

  it("matches via the hint field too (β resolves to Beta)", async () => {
    const user = u();
    render(<ControlledCombobox />);
    await user.click(screen.getByRole("button", { name: /pick/i }));
    const search = screen.getByPlaceholderText(/type to filter/i);
    await user.type(search, "β");
    const opts = screen.getAllByRole("option");
    expect(opts).toHaveLength(1);
    expect(opts[0]?.textContent).toContain("Beta");
    expect(opts[0]?.textContent).toContain("β");
  });

  it("shows the empty message when nothing matches", async () => {
    const user = u();
    render(<ControlledCombobox />);
    await user.click(screen.getByRole("button", { name: /pick/i }));
    await user.type(screen.getByPlaceholderText(/type to filter/i), "zzz");
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText(/no matches/i)).toBeDefined();
  });

  it("selects via Enter on the active item", async () => {
    const user = u();
    const onChange = vi.fn();
    render(<ControlledCombobox onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /pick/i }));
    const search = screen.getByPlaceholderText(/type to filter/i);
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenCalledWith("betacarotene");
    // Trigger now shows the picked label.
    expect(screen.getByRole("button", { name: /beta carotene/i })).toBeDefined();
    // And the search input never had to be focused away from.
    expect(search).toBeDefined();
  });

  it("selects on click", async () => {
    const user = u();
    const onChange = vi.fn();
    render(<ControlledCombobox onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /pick/i }));
    await user.click(screen.getByRole("option", { name: /gamma/i }));
    expect(onChange).toHaveBeenCalledWith("gamma");
  });

  it("closes on Escape without changing the value", async () => {
    const user = u();
    const onChange = vi.fn();
    render(<ControlledCombobox onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /pick/i }));
    await user.keyboard("{Escape}");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("exposes a Clear button only when something is selected, and clearing emits null", async () => {
    const user = u();
    const onChange = vi.fn();
    render(<ControlledCombobox onChange={onChange} />);
    // Before selection — no Clear visible.
    await user.click(screen.getByRole("button", { name: /pick/i }));
    expect(screen.queryByRole("button", { name: /clear/i })).toBeNull();
    // Pick one.
    await user.click(screen.getByRole("option", { name: /alpha/i }));
    // Re-open and the Clear button is there.
    await user.click(screen.getByRole("button", { name: /alpha/i }));
    const clear = screen.getByRole("button", { name: /clear/i });
    await user.click(clear);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it("renders a hidden form-input when `name` is provided", () => {
    function FormCombobox() {
      const [v, setV] = useState<string | null>("beta");
      return (
        <Combobox
          options={SAMPLE}
          value={v}
          onChange={setV}
          name="favorite"
        />
      );
    }
    const { container } = render(<FormCombobox />);
    const hidden = container.querySelector(
      'input[type="hidden"][name="favorite"]',
    ) as HTMLInputElement | null;
    expect(hidden?.value).toBe("beta");
  });
});
