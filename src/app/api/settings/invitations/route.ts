import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db/client";
import { auditEvents } from "@/db/schema";
import { requireWorkspaceAdmin } from "@/lib/auth/access";
import { createInvitation } from "@/lib/auth/invitations";
import { sendInvitationEmail } from "@/lib/mail/send-invitation";

const schema = z.object({
  workspaceId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["admin", "member"]),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const admin = await requireWorkspaceAdmin(input.workspaceId);
    const { token } = await createInvitation({
      ...input,
      invitedBy: admin.userId,
    });
    const invitationUrl = new URL(
      `/invite/${token}`,
      process.env.APP_ORIGIN ?? "http://127.0.0.1:3000",
    ).toString();
    const delivery = await sendInvitationEmail({
      email: input.email,
      invitationUrl,
    });
    await db.insert(auditEvents).values({
      workspaceId: input.workspaceId,
      actorUserId: admin.userId,
      action: "invitation.created",
      entityType: "invitation",
      detailsJson: {
        email: input.email.toLowerCase(),
        role: input.role,
        delivered: delivery.delivered,
      },
    });
    return NextResponse.json({
      created: true,
      delivered: delivery.delivered,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json(
      { error: message },
      { status: message === "FORBIDDEN" ? 403 : 400 },
    );
  }
}
