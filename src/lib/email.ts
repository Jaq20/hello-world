import "server-only";

// Minimal email sender. Uses Resend if RESEND_API_KEY is configured; otherwise
// logs to the server console so local/dev flows are fully exercisable without a
// mail provider. Swap or extend for SMTP/Supabase as needed.
export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "PropFlip <noreply@propflip.app>";

  if (!apiKey) {
    console.log(
      `\n[email:dev] To: ${opts.to}\n[email:dev] Subject: ${opts.subject}\n${opts.text}\n`,
    );
    return;
  }

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: opts.to, subject: opts.subject, text: opts.text }),
  });
}
