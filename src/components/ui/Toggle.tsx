import { useState } from "react";

export function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const [internal, setInternal] = useState(checked);
  const value = checked ?? internal;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        const next = !value;
        setInternal(next);
        onChange(next);
      }}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        value ? "bg-primary-600" : "bg-gray-200"
      }`}
      aria-pressed={value}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          value ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
