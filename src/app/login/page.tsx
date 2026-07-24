import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center p-8">
      <section className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
        <p className="mb-2 text-sm font-medium text-blue-700">
          Invitation required
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Sign in to the timeline
        </h1>
        <p className="mt-3 text-sm leading-6 text-black/60">
          Use the Google account matching your workspace invitation.
        </p>
        <Link
          className="mt-8 block rounded-full bg-black px-5 py-3 text-center text-sm font-medium text-white"
          href="/api/auth/signin/google"
        >
          Continue with Google
        </Link>
      </section>
    </main>
  );
}
