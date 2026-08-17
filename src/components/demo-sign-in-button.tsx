"use client";

import { signIn } from "next-auth/react";

export function DemoSignInButton({ email }: { email: string }) {
  return (
    <button
      className="mt-8 block w-full rounded-full bg-black px-5 py-3 text-center text-sm font-medium text-white"
      onClick={() => void signIn("credentials", { email, callbackUrl: "/timeline" })}
      type="button"
    >
      Continue in demo mode
    </button>
  );
}
