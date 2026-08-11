import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { signIn } = vi.hoisted(() => ({
  signIn: vi.fn(),
}));

vi.mock("next-auth/react", () => ({ signIn }));

import { GoogleSignInButton } from "@/components/google-sign-in-button";

describe("GoogleSignInButton", () => {
  it("starts the Google OAuth flow when clicked", () => {
    render(<GoogleSignInButton />);

    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    expect(signIn).toHaveBeenCalledWith("google", {
      callbackUrl: "/timeline",
    });
  });
});
