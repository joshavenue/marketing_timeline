import nodemailer from "nodemailer";

export interface InvitationMailInput {
  email: string;
  invitationUrl: string;
}

export async function sendInvitationEmail(input: InvitationMailInput) {
  const smtpUrl = process.env.SMTP_URL;
  const from = process.env.SMTP_FROM;

  if (!smtpUrl || !from) {
    return {
      delivered: false as const,
      reason: "SMTP is not configured",
    };
  }

  try {
    const transport = nodemailer.createTransport(smtpUrl);
    await transport.sendMail({
      from,
      to: input.email,
      subject: "Your Marketing Timeline invitation",
      text: `Accept your invitation: ${input.invitationUrl}`,
    });
    return { delivered: true as const };
  } catch {
    return {
      delivered: false as const,
      reason: "Invitation delivery failed; the invitation remains pending",
    };
  }
}
