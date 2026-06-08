"use client";

import { useRouter } from "next/navigation";

export default function BackButton({ label }: { label: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => {
        try { sessionStorage.setItem("racket_from_buy", "1"); } catch { /* ignore */ }
        router.back();
      }}
      className="font-sans text-sm text-muted hover:text-ink transition-colors underline"
    >
      {label}
    </button>
  );
}
