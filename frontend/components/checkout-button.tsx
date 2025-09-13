"use client";

import { useFormStatus } from "react-dom";

export default function CheckoutButton({
  highlighted,
  cta,
  disabled,
}: {
  highlighted?: boolean;
  cta: string;
  disabled: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled}
      className={`inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${
        highlighted
          ? "bg-indigo-600 text-white hover:bg-indigo-500"
          : "border border-foreground/20 text-foreground/90 hover:border-foreground/40"
      }`}
    >
      {pending ? "Loading..." : cta}
    </button>
  );
}
