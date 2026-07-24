import Link from "next/link";

interface InvitationPageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitationPage({
  params,
}: InvitationPageProps) {
  const { token } = await params;

  return (
    <main className="grid min-h-screen place-items-center p-8">
      <section className="max-w-lg rounded-2xl border border-black/10 bg-white p-8">
        <p className="text-sm font-medium text-blue-700">Workspace invitation</p>
        <h1 className="mt-2 text-3xl font-semibold">Finish with Google</h1>
        <p className="mt-3 text-sm leading-6 text-black/60">
          Sign in with the exact email address that received this invitation.
        </p>
        <Link
          className="mt-8 block rounded-full bg-black px-5 py-3 text-center text-sm font-medium text-white"
          href={`/api/auth/signin/google?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}
        >
          Verify Google account
        </Link>
      </section>
    </main>
  );
}
