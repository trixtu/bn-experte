import { Resend } from "resend";

let resend: Resend | null = null;

interface SendEmailValues {
  to: string;
  subject: string;
  text: string;
}

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY environment variable.");
  }

  resend ??= new Resend(apiKey);
  return resend;
}

export async function sendEmail({ to, subject, text }: SendEmailValues) {
  await getResend().emails.send({
    from: "verification@codinginflow-sample.com",
    to,
    subject,
    text,
  });
}
