/**
 * Email service using Brevo (formerly Sendinblue) transactional API
 */

const BREVO_API_KEY = process.env.BREVO_API_KEY!;
const FROM_EMAIL = process.env.FROM_EMAIL || "info@plumboost.com";
const FROM_NAME = process.env.FROM_NAME || "PlumBoost";
const APP_URL = process.env.APP_URL || "https://plumboost.com";

interface EmailPayload {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
}

async function sendEmail(payload: EmailPayload): Promise<void> {
  if (!BREVO_API_KEY) {
    console.warn("[email] BREVO_API_KEY not set — skipping email send");
    return;
  }
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": BREVO_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      ...payload,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("[email] Brevo error:", res.status, body);
  }
}

// ── Email Templates ───────────────────────────────────────────────────────────

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f0f; color: #e5e5e5; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; padding: 0 20px; }
    .card { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 32px; }
    .logo { font-size: 22px; font-weight: 700; color: #a855f7; margin-bottom: 24px; }
    h1 { font-size: 22px; font-weight: 600; margin: 0 0 12px; color: #f5f5f5; }
    p { font-size: 15px; line-height: 1.6; color: #a3a3a3; margin: 0 0 16px; }
    .btn { display: inline-block; background: #a855f7; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 8px 0 16px; }
    .footer { font-size: 12px; color: #525252; margin-top: 24px; text-align: center; }
    .metric { display: inline-block; background: #262626; border-radius: 8px; padding: 12px 16px; margin: 4px; text-align: center; }
    .metric-value { font-size: 24px; font-weight: 700; color: #a855f7; }
    .metric-label { font-size: 11px; color: #737373; margin-top: 2px; }
    hr { border: none; border-top: 1px solid #2a2a2a; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">🟣 PlumBoost</div>
      ${content}
    </div>
    <div class="footer">PlumBoost · AI Search Visibility Platform<br>
      <a href="${APP_URL}/unsubscribe" style="color:#525252">Unsubscribe</a>
    </div>
  </div>
</body>
</html>`;
}

export async function sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
  const verifyUrl = `${APP_URL}/api/auth/verify-email?token=${token}`;
  await sendEmail({
    to: [{ email: to, name }],
    subject: "Verify your PlumBoost email address",
    htmlContent: baseTemplate(`
      <h1>Verify your email, ${name}</h1>
      <p>Thanks for signing up for PlumBoost. Click the button below to verify your email address and access your dashboard.</p>
      <a href="${verifyUrl}" class="btn">Verify Email Address →</a>
      <p style="font-size:13px;color:#525252">This link expires in 24 hours. If you didn't create a PlumBoost account, you can safely ignore this email.</p>
      <hr>
      <p style="font-size:12px;color:#525252">Can't click the button? Copy and paste this link into your browser:<br>
      <span style="color:#a855f7;word-break:break-all">${verifyUrl}</span></p>
    `),
  });
}

export async function sendWelcomeEmail(to: string, name: string, orgName: string): Promise<void> {
  await sendEmail({
    to: [{ email: to, name }],
    subject: "Welcome to PlumBoost — let's run your first scan",
    htmlContent: baseTemplate(`
      <h1>You're verified, ${name}! 🎉</h1>
      <p>Your workspace <strong>${orgName}</strong> is ready. Let's see how your brand appears in ChatGPT, Claude, Gemini, and Grok.</p>
      <p>Get started in 3 steps:</p>
      <p>1. <strong>Create a project</strong> — add your domain and brand name<br>
         2. <strong>Add prompts</strong> — the questions your customers ask AI<br>
         3. <strong>Run your first scan</strong> — see your AI visibility score</p>
      <a href="${APP_URL}" class="btn">Go to Dashboard →</a>
      <hr>
      <p style="font-size:13px">Your free plan includes 1 scan. Upgrade anytime to unlock all 4 AI models, competitor tracking, and weekly reports.</p>
    `),
  });
}

export async function sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  await sendEmail({
    to: [{ email: to, name }],
    subject: "Reset your PlumBoost password",
    htmlContent: baseTemplate(`
      <h1>Reset your password</h1>
      <p>We received a request to reset the password for your PlumBoost account. Click the button below to set a new password.</p>
      <a href="${resetUrl}" class="btn">Reset Password →</a>
      <p style="font-size:13px;color:#525252">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
    `),
  });
}

export async function sendInvitationEmail(
  to: string,
  inviterName: string,
  orgName: string,
  token: string,
  role: string
): Promise<void> {
  const inviteUrl = `${APP_URL}/accept-invite?token=${token}`;
  await sendEmail({
    to: [{ email: to }],
    subject: `${inviterName} invited you to join ${orgName} on PlumBoost`,
    htmlContent: baseTemplate(`
      <h1>You've been invited!</h1>
      <p><strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on PlumBoost as a <strong>${role}</strong>.</p>
      <p>PlumBoost tracks how your brand appears in AI search results across ChatGPT, Claude, Gemini, and Grok.</p>
      <a href="${inviteUrl}" class="btn">Accept Invitation →</a>
      <p style="font-size:13px;color:#525252">This invitation expires in 7 days.</p>
    `),
  });
}

export async function sendWeeklyReport(
  to: string,
  name: string,
  projectName: string,
  metrics: {
    visibilityPct: number;
    visibilityChange: number;
    sovPct: number;
    sovChange: number;
    avgRank: number;
    rankChange: number;
    topModel: string;
  }
): Promise<void> {
  const changeArrow = (v: number) => v > 0 ? `▲ +${v.toFixed(1)}` : v < 0 ? `▼ ${v.toFixed(1)}` : "→ 0";
  const changeColor = (v: number) => v > 0 ? "#22c55e" : v < 0 ? "#ef4444" : "#737373";

  await sendEmail({
    to: [{ email: to, name }],
    subject: `📊 Weekly AI Visibility Report — ${projectName}`,
    htmlContent: baseTemplate(`
      <h1>Your weekly AI visibility report</h1>
      <p>Here's how <strong>${projectName}</strong> performed in AI search this week:</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin:16px 0;">
        <div class="metric">
          <div class="metric-value">${metrics.visibilityPct.toFixed(1)}%</div>
          <div class="metric-label">AI Visibility</div>
          <div style="font-size:12px;color:${changeColor(metrics.visibilityChange)}">${changeArrow(metrics.visibilityChange)}%</div>
        </div>
        <div class="metric">
          <div class="metric-value">${metrics.sovPct.toFixed(1)}%</div>
          <div class="metric-label">Share of Voice</div>
          <div style="font-size:12px;color:${changeColor(metrics.sovChange)}">${changeArrow(metrics.sovChange)}%</div>
        </div>
        <div class="metric">
          <div class="metric-value">#${metrics.avgRank.toFixed(1)}</div>
          <div class="metric-label">Avg. Rank</div>
          <div style="font-size:12px;color:${changeColor(-metrics.rankChange)}">${changeArrow(-metrics.rankChange)}</div>
        </div>
      </div>
      <p>Your brand performs best on <strong>${metrics.topModel}</strong> this week.</p>
      <a href="${APP_URL}" class="btn">View Full Report →</a>
      <hr>
      <p style="font-size:13px">Want to improve these scores? Visit your <a href="${APP_URL}" style="color:#a855f7">Boost Actions</a> for AI-generated recommendations.</p>
    `),
  });
}

export async function sendScanCompleteEmail(
  to: string,
  name: string,
  projectName: string,
  scanId: number
): Promise<void> {
  await sendEmail({
    to: [{ email: to, name }],
    subject: `✅ Scan complete — ${projectName}`,
    htmlContent: baseTemplate(`
      <h1>Your scan is ready</h1>
      <p>The AI visibility scan for <strong>${projectName}</strong> has completed. Your updated scores are now available in the dashboard.</p>
      <a href="${APP_URL}" class="btn">View Results →</a>
    `),
  });
}
