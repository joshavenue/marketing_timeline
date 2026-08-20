import { and, eq } from "drizzle-orm";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { db } from "@/db/client";
import { memberships, users } from "@/db/schema";
import { hasActiveMembershipOrInvitation } from "@/lib/auth/invitations";

const isLocalE2eMode =
  process.env.APP_ENV === "test" &&
  process.env.E2E_TEST_MODE === "1" &&
  ["localhost", "127.0.0.1"].includes(
    new URL(process.env.APP_ORIGIN ?? "http://invalid").hostname,
  );

const isPublicE2eMode =
  process.env.APP_ENV === "test" &&
  process.env.E2E_TEST_MODE === "1" &&
  process.env.E2E_ALLOW_PUBLIC === "1";

const isSafeE2eMode = isLocalE2eMode || isPublicE2eMode;

const providers: NextAuthOptions["providers"] = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}

if (isSafeE2eMode) {
  providers.push(
    CredentialsProvider({
      name: "Test account",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const allowed = [
          process.env.E2E_TEST_ADMIN_EMAIL,
          process.env.E2E_TEST_MEMBER_EMAIL,
        ]
          .filter(Boolean)
          .map((value) => value!.toLowerCase());

        return email && allowed.includes(email)
          ? { id: email, email, name: email.split("@")[0] }
          : null;
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  providers,
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user, account, profile }) {
      const email = user.email?.trim().toLowerCase();
      if (!email) return false;

      if (account?.provider === "google") {
        const verified = (profile as { email_verified?: boolean } | undefined)
          ?.email_verified;
        if (verified !== true) return false;
      } else if (!isSafeE2eMode) {
        return false;
      }

      return hasActiveMembershipOrInvitation(email);
    },
    async session({ session }) {
      const email = session.user?.email?.trim().toLowerCase();
      if (!email) return session;

      const [membership] = await db
        .select({ active: memberships.active })
        .from(memberships)
        .innerJoin(users, eq(users.id, memberships.userId))
        .where(and(eq(users.email, email), eq(memberships.active, true)))
        .limit(1);

      if (!membership) {
        session.expires = new Date(0).toISOString();
      }
      return session;
    },
  },
};
