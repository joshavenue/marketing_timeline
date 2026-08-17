import { DemoSignInButton } from "@/components/demo-sign-in-button";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const isDemoMode =
    process.env.APP_ENV === "test" &&
    process.env.E2E_TEST_MODE === "1" &&
    (() => {
      try {
        return (
          new URL(process.env.APP_ORIGIN ?? "http://invalid").hostname ===
          "localhost"
        );
      } catch {
        return false;
      }
    })();

  return (
    <main className="grid min-h-screen place-items-center p-8">
      <section className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
        <p className="mb-2 text-sm font-medium text-blue-700">
          {isDemoMode ? "Presentation demo" : "Invitation required"}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Sign in to the timeline
        </h1>
        <p className="mt-3 text-sm leading-6 text-black/60">
          {isDemoMode
            ? "Use the temporary demo account for this presentation instance."
            : "Use the Google account matching your workspace invitation."}
        </p>
        {isDemoMode ? (
          <DemoSignInButton
            email={process.env.E2E_TEST_ADMIN_EMAIL ?? "demo@example.com"}
          />
        ) : (
          <GoogleSignInButton />
        )}
      </section>
    </main>
  );
}
