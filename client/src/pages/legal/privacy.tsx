import { useLocation } from "wouter";

export default function PrivacyPolicy() {
  const [, navigate] = useLocation();
  const updated = "29 April 2026";

  return (
    <div style={{ background: "#070B14", minHeight: "100vh", color: "#F1F5F9", fontFamily: "'Syne', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400&display=swap');
        .legal-wrap { max-width: 720px; margin: 0 auto; padding: 64px 32px 96px; }
        .legal-back { display:inline-flex;align-items:center;gap:6px;font-size:13px;color:#64748B;cursor:pointer;background:none;border:none;font-family:inherit;margin-bottom:48px;transition:color .2s; }
        .legal-back:hover { color:#F1F5F9; }
        .legal-badge { font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#A855F7;margin-bottom:12px; }
        .legal-title { font-size:36px;font-weight:800;letter-spacing:-.025em;margin-bottom:8px; }
        .legal-date { font-family:'IBM Plex Mono',monospace;font-size:12px;color:#64748B;margin-bottom:48px; }
        .legal-body h2 { font-size:18px;font-weight:700;margin:40px 0 12px;color:#F1F5F9; }
        .legal-body h3 { font-size:15px;font-weight:600;margin:24px 0 8px;color:#CBD5E1; }
        .legal-body p { font-size:15px;color:#94A3B8;line-height:1.75;margin-bottom:16px; }
        .legal-body ul { padding-left:20px;margin-bottom:16px; }
        .legal-body li { font-size:15px;color:#94A3B8;line-height:1.75;margin-bottom:6px; }
        .legal-body a { color:#A855F7;text-decoration:none; }
        .legal-body a:hover { text-decoration:underline; }
        .legal-divider { border:none;border-top:1px solid rgba(255,255,255,0.07);margin:40px 0; }
        .legal-contact { background:#0D1424;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:24px;margin-top:48px; }
        .legal-contact p { margin:0;font-size:14px;color:#94A3B8; }
      `}</style>

      <div className="legal-wrap">
        <button className="legal-back" onClick={() => navigate("/")}>
          ← Back to PlumBoost
        </button>

        <div className="legal-badge">Legal</div>
        <h1 className="legal-title">Privacy Policy</h1>
        <div className="legal-date">Last updated: {updated}</div>

        <div className="legal-body">
          <p>PlumBoost ("we", "us", or "our") operates plumboost.com and the PlumBoost platform (the "Service"). This Privacy Policy explains what personal data we collect, how we use it, who we share it with, and your rights regarding that data. Please read it carefully.</p>
          <p>By using the Service, you agree to the collection and use of information in accordance with this policy. If you do not agree, please do not use the Service.</p>

          <hr className="legal-divider"/>

          <h2>1. Who We Are</h2>
          <p>PlumBoost is operated as a software-as-a-service product. For questions about this policy or your data, contact us at <a href="mailto:privacy@plumboost.com">privacy@plumboost.com</a>.</p>

          <h2>2. What Data We Collect</h2>

          <h3>2.1 Account Information</h3>
          <p>When you create an account, we collect:</p>
          <ul>
            <li>Your name and email address</li>
            <li>Your organization name</li>
            <li>A hashed version of your password (we never store your password in plain text)</li>
          </ul>

          <h3>2.2 Project Data</h3>
          <p>To deliver the Service, we store the data you provide when creating projects, including:</p>
          <ul>
            <li>Brand names and domains you wish to monitor</li>
            <li>Competitor brand names</li>
            <li>Prompts you configure for AI scanning</li>
            <li>Tags, industry, and country settings</li>
          </ul>

          <h3>2.3 Usage and Analytics Data</h3>
          <p>We collect data about how you use the Service, including:</p>
          <ul>
            <li>Scan history and results (AI visibility scores, sentiment data, citations)</li>
            <li>Pages visited and features used within the platform</li>
            <li>IP address and browser/device type for security purposes</li>
            <li>Timestamps of logins and key actions</li>
          </ul>

          <h3>2.4 Payment Information</h3>
          <p>If you upgrade to a paid plan, payment is processed by <strong>Stripe</strong>. We do not store your full credit card number, CVV, or payment credentials on our servers. Stripe handles all payment data under their own <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>. We store only your Stripe Customer ID and subscription status.</p>

          <h3>2.5 Communications</h3>
          <p>We store email addresses for the purpose of sending transactional emails (scan completion notifications, password resets, team invitations). We use <strong>Brevo</strong> as our email delivery provider. We do not send marketing emails without your explicit consent.</p>

          <h3>2.6 Session Data</h3>
          <p>We use session cookies to keep you logged in. These are strictly necessary cookies and are required for the Service to function. See our <button onClick={() => navigate("/cookies")} style={{ background: "none", border: "none", color: "#A855F7", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", padding: 0 }}>Cookie Policy</button> for details.</p>

          <hr className="legal-divider"/>

          <h2>3. How We Use Your Data</h2>
          <p>We use the data we collect to:</p>
          <ul>
            <li>Provide, operate, and improve the Service</li>
            <li>Process your AI visibility scans by sending your configured prompts to external AI models via OpenRouter (see Section 5)</li>
            <li>Send you transactional emails (scan results, account notifications, password resets)</li>
            <li>Process billing and manage subscriptions via Stripe</li>
            <li>Enforce our Terms of Service and prevent abuse</li>
            <li>Respond to support inquiries</li>
            <li>Comply with legal obligations</li>
          </ul>
          <p>We do not use your data for advertising. We do not sell your data to third parties. We do not use your project data or scan results to train AI models.</p>

          <hr className="legal-divider"/>

          <h2>4. Legal Basis for Processing (GDPR)</h2>
          <p>If you are located in the European Economic Area (EEA), we process your personal data under the following legal bases:</p>
          <ul>
            <li><strong>Contract performance:</strong> Processing necessary to provide the Service you have subscribed to</li>
            <li><strong>Legitimate interests:</strong> Security monitoring, fraud prevention, and service improvement</li>
            <li><strong>Legal obligation:</strong> Compliance with applicable laws</li>
            <li><strong>Consent:</strong> Where you have explicitly consented (e.g., optional email communications)</li>
          </ul>

          <hr className="legal-divider"/>

          <h2>5. AI Model Processing — Third-Party Disclosure</h2>
          <p>The core function of PlumBoost is to query AI language models on your behalf. When you run a scan, your configured prompts are transmitted to the following AI providers via <strong>OpenRouter</strong>:</p>
          <ul>
            <li>OpenAI (ChatGPT / GPT-4o)</li>
            <li>Anthropic (Claude)</li>
            <li>Google (Gemini)</li>
            <li>xAI (Grok)</li>
          </ul>
          <p>These providers process your prompts under their own terms of service and privacy policies. Your prompts are used solely for the purpose of generating AI responses for analysis — we do not transmit any personally identifiable information about you or your end users to these AI providers as part of scan prompts.</p>
          <p>We recommend reviewing OpenRouter's <a href="https://openrouter.ai/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a> and the individual policies of the AI providers listed above.</p>

          <hr className="legal-divider"/>

          <h2>6. Data Sharing</h2>
          <p>We share your data only with the following categories of recipients, and only to the extent necessary to provide the Service:</p>
          <ul>
            <li><strong>Stripe</strong> — Payment processing</li>
            <li><strong>Brevo</strong> — Transactional email delivery</li>
            <li><strong>OpenRouter / AI providers</strong> — Scan prompt processing (see Section 5)</li>
            <li><strong>Railway</strong> — Cloud infrastructure and database hosting</li>
            <li><strong>Cloudflare</strong> — DNS, CDN, and DDoS protection</li>
          </ul>
          <p>We do not share your personal data with advertisers, data brokers, or unaffiliated third parties for their own purposes.</p>
          <p>We may disclose your data if required by law, court order, or to protect the rights, property, or safety of PlumBoost, our users, or the public.</p>
          <p>In the event of a merger, acquisition, or sale of assets, your data may be transferred to the acquiring entity, subject to the same privacy protections described here.</p>

          <hr className="legal-divider"/>

          <h2>7. Data Retention</h2>
          <p>We retain your personal data for as long as your account is active or as needed to provide the Service. Specifically:</p>
          <ul>
            <li><strong>Account data</strong> — Retained until you delete your account</li>
            <li><strong>Project and scan data</strong> — Retained until you delete the project or your account</li>
            <li><strong>Billing records</strong> — Retained for 7 years for tax and legal compliance purposes, even after account deletion</li>
            <li><strong>Server logs</strong> — Retained for up to 90 days for security monitoring</li>
          </ul>

          <hr className="legal-divider"/>

          <h2>8. Your Rights</h2>
          <p>Depending on your location, you may have the following rights regarding your personal data:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
            <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
            <li><strong>Deletion:</strong> Request deletion of your personal data (subject to legal retention requirements)</li>
            <li><strong>Portability:</strong> Request your data in a structured, machine-readable format</li>
            <li><strong>Objection:</strong> Object to processing based on legitimate interests</li>
            <li><strong>Restriction:</strong> Request restriction of processing in certain circumstances</li>
            <li><strong>Withdraw consent:</strong> Where processing is based on consent, withdraw it at any time</li>
          </ul>
          <p>To exercise any of these rights, email <a href="mailto:privacy@plumboost.com">privacy@plumboost.com</a>. We will respond within 30 days. We may need to verify your identity before processing requests.</p>
          <p>If you are in the EEA, you also have the right to lodge a complaint with your local data protection authority.</p>

          <hr className="legal-divider"/>

          <h2>9. Data Security</h2>
          <p>We implement technical and organizational measures to protect your data, including:</p>
          <ul>
            <li>Passwords stored as bcrypt hashes — never in plain text</li>
            <li>API keys stored as SHA-256 hashes — raw keys shown only once at creation</li>
            <li>HTTPS encryption for all data in transit</li>
            <li>Session tokens stored server-side in a PostgreSQL database with secure cookie settings (httpOnly, secure, sameSite)</li>
            <li>Rate limiting on authentication endpoints to prevent brute-force attacks</li>
            <li>Access controls — each organization's data is isolated and cannot be accessed by other users</li>
          </ul>
          <p>No method of transmission or storage is 100% secure. We cannot guarantee absolute security, but we are committed to using industry-standard practices to protect your data.</p>

          <hr className="legal-divider"/>

          <h2>10. International Data Transfers</h2>
          <p>PlumBoost is hosted on infrastructure in the United States (Railway / Google Cloud). If you are located outside the US, your data may be transferred to and processed in the US. By using the Service, you consent to this transfer.</p>
          <p>For EEA users, we rely on Standard Contractual Clauses (SCCs) where required by GDPR for transfers to third-party processors outside the EEA.</p>

          <hr className="legal-divider"/>

          <h2>11. Children's Privacy</h2>
          <p>The Service is not directed at children under the age of 16. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us and we will delete it.</p>

          <hr className="legal-divider"/>

          <h2>12. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new policy on this page and updating the "Last updated" date. For significant changes, we may also notify you by email. Your continued use of the Service after changes are posted constitutes acceptance of the updated policy.</p>

          <hr className="legal-divider"/>

          <div className="legal-contact">
            <p><strong style={{ color: "#F1F5F9" }}>Questions about this policy?</strong><br/>
            Contact our privacy team at <a href="mailto:privacy@plumboost.com" style={{ color: "#A855F7" }}>privacy@plumboost.com</a>. We aim to respond within 5 business days.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
