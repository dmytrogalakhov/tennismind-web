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
      className="text-sm text-white/60 hover:text-white transition-colors underline"
    >
      {label}
    </button>
  );
}
