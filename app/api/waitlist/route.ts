export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_API_URL = "https://api.resend.com/emails";

function getClientIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    null
  );
}

async function insertWaitlistEmail(params: {
  email: string;
  source: string;
  userAgent: string | null;
  ipAddress: string | null;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase waitlist is not configured.");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/waitlist`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      email: params.email,
      source: params.source,
      user_agent: params.userAgent,
      ip_address: params.ipAddress,
      metadata: {},
    }),
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const code = typeof payload?.code === "string" ? payload.code : "";
    if (response.status === 409 || code === "23505") {
      return { duplicate: true };
    }
    throw new Error(typeof payload?.message === "string" ? payload.message : "Could not join waitlist.");
  }

  return { duplicate: false };
}

async function sendResendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.OFFICIA_EMAIL_FROM || "Officia <onboarding@resend.dev>";

  if (!apiKey) {
    return { skipped: true };
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Resend email failed:", errorText);
    return { skipped: false, error: true };
  }

  return { skipped: false, error: false };
}

async function sendWaitlistEmails(email: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://officia.bg";
  const notifyTo = process.env.OFFICIA_LEAD_NOTIFY_TO;

  await sendResendEmail({
    to: email,
    subject: "Welcome to the Officia waitlist",
    text: `You're on the Officia waitlist.\n\nOfficia is an AI-first office OS for accountants and office teams.\n\nWe'll keep you posted: ${siteUrl}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#0F1F3D">
        <div style="font-size:14px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#4F46E5">Officia</div>
        <h1 style="font-size:32px;line-height:1.15;margin:18px 0 12px">You're on the waitlist.</h1>
        <p style="font-size:16px;line-height:1.7;color:#475569">Thanks for joining Officia — the AI-first office OS for accountants and modern office teams.</p>
        <p style="font-size:16px;line-height:1.7;color:#475569">We'll share early access updates, product previews and launch details soon.</p>
        <a href="${siteUrl}" style="display:inline-block;margin-top:18px;background:#4F46E5;color:#fff;text-decoration:none;font-weight:700;padding:14px 18px;border-radius:14px">Visit Officia</a>
        <p style="margin-top:28px;font-size:13px;color:#94a3b8">Your office. Smarter.</p>
      </div>
    `,
  });

  if (notifyTo) {
    await sendResendEmail({
      to: notifyTo,
      subject: "New Officia waitlist lead",
      text: `New waitlist signup: ${email}`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#0F1F3D">
          <h1 style="font-size:24px;margin:0 0 12px">New Officia waitlist lead</h1>
          <p style="font-size:16px;color:#475569"><strong>Email:</strong> ${email}</p>
        </div>
      `,
    });
  }
}

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const email = String((body as { email?: unknown })?.email || "").trim().toLowerCase();
    const source = String((body as { source?: unknown })?.source || "landing").trim() || "landing";

    if (!EMAIL_REGEX.test(email)) {
      return Response.json({ error: "Въведи валиден имейл адрес." }, { status: 400 });
    }

    const result = await insertWaitlistEmail({
      email,
      source,
      userAgent: req.headers.get("user-agent"),
      ipAddress: getClientIp(req),
    });

    if (result.duplicate) {
      return Response.json({ ok: true, duplicate: true, message: "Вече си в waitlist-а." });
    }

    await sendWaitlistEmails(email);

    return Response.json({ ok: true, duplicate: false, message: "Готово — записан си за early access." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not join waitlist.";
    const isConfigError = message.includes("not configured");
    return Response.json(
      { error: isConfigError ? "Waitlist backend не е конфигуриран още." : "Не успяхме да те запишем. Опитай отново." },
      { status: isConfigError ? 503 : 500 },
    );
  }
}
