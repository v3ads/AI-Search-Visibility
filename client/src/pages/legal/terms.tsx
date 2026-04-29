import { useLocation } from "wouter";

export default function TermsOfService() {
  const [, navigate] = useLocation();
  const updated = "29 April 2026";

  return (
    <div style={{ background: "#070B14", minHeight: "100vh", color: "#F1F5F9", fontFamily: "'Syne', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400&display=swap');
        .legal-wrap{max-width:720px;margin:0 auto;padding:64px 32px 96px}
        .legal-back{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:#64748B;cursor:pointer;background:none;border:none;font-family:inherit;margin-bottom:48px;transition:color .2s}
        .legal-back:hover{color:#F1F5F9}
        .legal-badge{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#A855F7;margin-bottom:12px}
        .legal-title{font-size:36px;font-weight:800;letter-spacing:-.025em;margin-bottom:8px}
        .legal-date{font-family:'IBM Plex Mono',monospace;font-size:12px;color:#64748B;margin-bottom:48px}
        .legal-body h2{font-size:18px;font-weight:700;margin:40px 0 12px;color:#F1F5F9}
        .legal-body h3{font-size:15px;font-weight:600;margin:24px 0 8px;color:#CBD5E1}
        .legal-body p{font-size:15px;color:#94A3B8;line-height:1.75;margin-bottom:16px}
        .legal-body ul{padding-left:20px;margin-bottom:16px}
        .legal-body li{font-size:15px;color:#94A3B8;line-height:1.75;margin-bottom:6px}
        .legal-body a{color:#A855F7;text-decoration:none}
        .legal-body a:hover{text-decoration:underline}
        .legal-divider{border:none;border-top:1px solid rgba(255,255,255,0.07);margin:40px 0}
        .legal-contact{background:#0D1424;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:24px;margin-top:48px}
        .legal-contact p{margin:0;font-size:14px;color:#94A3B8}
        .legal-highlight{background:rgba(168,85,247,0.08);border:1px solid rgba(168,85,247,0.2);border-radius:8px;padding:16px 20px;margin-bottom:24px}
        .legal-highlight p{margin:0;font-size:14px;color:#CBD5E1}
      `}</style>

      <div className="legal-wrap">
        <button className="legal-back" onClick={() => navigate("/")}>← Back to PlumBoost</button>

        <div className="legal-badge">Legal</div>
        <h1 className="legal-title">Terms of Service</h1>
        <div className="legal-date">Last updated: {updated}</div>

        <div className="legal-body">
          <div className="legal-highlight">
            <p><strong style={{ color: "#F1F5F9" }}>Summary:</strong> PlumBoost is a paid SaaS service. By using it, you agree to use it lawfully, pay for your plan, and not abuse the platform. AI-generated results are provided as data — we don't guarantee their accuracy or completeness. Full details below.</p>
          </div>

          <p>These Terms of Service ("Terms") govern your access to and use of the PlumBoost platform and services ("Service") operated by PlumBoost ("we", "us", "our"). By creating an account or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.</p>

          <hr className="legal-divider"/>

          <h2>1. Eligibility</h2>
          <p>You must be at least 18 years old and have the legal authority to enter into these Terms on behalf of yourself or your organization. By using the Service, you represent that you meet these requirements. The Service is not available to individuals or organizations that have been previously terminated or suspended from the Service.</p>

          <h2>2. Account Registration</h2>
          <p>To use the Service, you must register for an account. You agree to:</p>
          <ul>
            <li>Provide accurate and complete information during registration</li>
            <li>Keep your account credentials confidential and not share them with others</li>
            <li>Notify us immediately of any unauthorized access to your account</li>
            <li>Be responsible for all activity that occurs under your account</li>
          </ul>
          <p>We reserve the right to suspend or terminate accounts that provide inaccurate information or violate these Terms.</p>

          <hr className="legal-divider"/>

          <h2>3. Plans, Billing, and Payment</h2>

          <h3>3.1 Plan Selection</h3>
          <p>PlumBoost offers Free, Starter, Growth, and Agency plans. The features and limits of each plan are described on our pricing page. By selecting a paid plan, you authorize us to charge you on a recurring basis.</p>

          <h3>3.2 Payment Processing</h3>
          <p>All payments are processed by Stripe. By providing payment information, you authorize Stripe to charge your payment method for the applicable subscription fees. You agree to Stripe's Terms of Service and Privacy Policy.</p>

          <h3>3.3 Billing Cycle</h3>
          <p>Subscriptions are billed monthly or annually depending on your selection. Your subscription renews automatically at the end of each billing period unless you cancel before the renewal date.</p>

          <h3>3.4 Price Changes</h3>
          <p>We may change our pricing at any time. We will provide at least 30 days' notice of any price increase via email. Continued use of the Service after the price change takes effect constitutes acceptance of the new pricing.</p>

          <h3>3.5 Refund Policy</h3>
          <p>We offer a <strong>7-day money-back guarantee</strong> on first-time purchases of paid plans. If you are unsatisfied within the first 7 days, contact <a href="mailto:billing@plumboost.com">billing@plumboost.com</a> for a full refund. After 7 days, all payments are non-refundable except where required by applicable law.</p>
          <p>Downgrades to a lower plan take effect at the end of the current billing cycle. We do not provide prorated refunds for unused portions of a billing period.</p>

          <h3>3.6 Taxes</h3>
          <p>Prices are exclusive of applicable taxes. You are responsible for all taxes associated with your purchase, except for taxes based on our net income.</p>

          <hr className="legal-divider"/>

          <h2>4. Acceptable Use</h2>
          <p>You agree to use the Service only for lawful purposes and in a manner consistent with these Terms. You must not:</p>
          <ul>
            <li>Use the Service to violate any applicable law or regulation</li>
            <li>Submit prompts designed to extract harmful, illegal, or malicious information from AI models</li>
            <li>Attempt to reverse-engineer, decompile, or disassemble any part of the Service</li>
            <li>Use automated tools to scrape, crawl, or extract data from the Service beyond what is permitted by our API</li>
            <li>Attempt to gain unauthorized access to any part of the Service or its infrastructure</li>
            <li>Use the Service to monitor competitors for purposes of harassment, defamation, or unfair business practices</li>
            <li>Resell or white-label the Service without a specific written agreement (Agency plan white-label rights are limited to client reporting only)</li>
            <li>Interfere with or disrupt the integrity or performance of the Service</li>
            <li>Use the Service in any way that could expose us or our users to legal liability</li>
          </ul>

          <hr className="legal-divider"/>

          <h2>5. AI-Generated Content — Disclaimer</h2>
          <p>The Service queries third-party AI language models (including ChatGPT, Claude, Gemini, and Grok) and analyzes their responses. You acknowledge and agree that:</p>
          <ul>
            <li>AI-generated responses are probabilistic and may vary between queries, sessions, and over time</li>
            <li>AI visibility scores, sentiment analysis, and rankings are derived data — they are approximations, not definitive measurements</li>
            <li>We do not guarantee the accuracy, completeness, or reliability of any AI-generated data or derived metric</li>
            <li>Boost Action recommendations are AI-generated suggestions — they should be evaluated by a qualified marketing professional before implementation</li>
            <li>Results may differ from what a human user would experience querying the same AI systems directly</li>
            <li>We are not responsible for decisions made based on AI-generated data provided by the Service</li>
          </ul>

          <hr className="legal-divider"/>

          <h2>6. Data and Intellectual Property</h2>

          <h3>6.1 Your Data</h3>
          <p>You retain ownership of all data you submit to the Service, including brand names, domains, prompts, and competitor lists ("Your Data"). You grant us a limited license to use Your Data solely to provide the Service to you.</p>

          <h3>6.2 Scan Results</h3>
          <p>Scan results, metrics, and reports generated by the Service are derived works produced for your account. You may use them for your own business purposes. You may not resell or publicly distribute raw scan data or API responses without our written permission.</p>

          <h3>6.3 Our Intellectual Property</h3>
          <p>The Service, including its software, algorithms, design, and content (excluding Your Data), is owned by PlumBoost and protected by copyright, trademark, and other intellectual property laws. Nothing in these Terms grants you a right to use our name, logos, or trademarks without our prior written consent.</p>

          <h3>6.4 Feedback</h3>
          <p>If you submit feedback, suggestions, or ideas about the Service, you grant us an irrevocable, worldwide, royalty-free license to use and incorporate that feedback without restriction or compensation to you.</p>

          <hr className="legal-divider"/>

          <h2>7. Team Members and Organizations</h2>
          <p>If you invite team members to your organization within the Service, you are responsible for their compliance with these Terms. You represent that you have the authority to bind your organization and its members to these Terms. Each user added to your organization consumes one seat (where applicable under your plan).</p>

          <hr className="legal-divider"/>

          <h2>8. API Access</h2>
          <p>API access is available on Growth and Agency plans. If you use the PlumBoost API, you agree to:</p>
          <ul>
            <li>Keep your API keys confidential and not embed them in publicly accessible code</li>
            <li>Use the API only for your own internal business purposes</li>
            <li>Not exceed the rate limits specified in our documentation</li>
            <li>Not use the API to build a competing service</li>
          </ul>
          <p>We may revoke API access if we determine it is being used in violation of these Terms.</p>

          <hr className="legal-divider"/>

          <h2>9. Service Availability and Modifications</h2>
          <p>We will make reasonable efforts to keep the Service available, but we do not guarantee uninterrupted or error-free access. We may:</p>
          <ul>
            <li>Perform scheduled maintenance (we will endeavor to provide advance notice)</li>
            <li>Modify, update, or discontinue features of the Service at any time</li>
            <li>Change plan limits or features with 30 days' notice for material changes affecting paid plans</li>
          </ul>
          <p>We are not liable for any loss or damage caused by Service downtime or interruption.</p>

          <hr className="legal-divider"/>

          <h2>10. Termination</h2>

          <h3>10.1 By You</h3>
          <p>You may cancel your account at any time through the billing settings or by contacting <a href="mailto:support@plumboost.com">support@plumboost.com</a>. Cancellation takes effect at the end of your current billing cycle. Your data will be retained for 30 days after account closure, after which it will be permanently deleted.</p>

          <h3>10.2 By Us</h3>
          <p>We may suspend or terminate your account immediately if you violate these Terms, fail to pay applicable fees, or for any other reason at our discretion. In cases of material breach, we are not obligated to provide a refund for any unused portion of your subscription.</p>

          <hr className="legal-divider"/>

          <h2>11. Limitation of Liability</h2>
          <p>To the maximum extent permitted by applicable law, PlumBoost and its officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of revenue, data, goodwill, or business opportunities, arising from or related to your use of the Service.</p>
          <p>Our total liability to you for any claims arising under these Terms shall not exceed the amount you paid us in the 12 months preceding the claim.</p>

          <h2>12. Disclaimer of Warranties</h2>
          <p>The Service is provided "as is" and "as available" without warranties of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or free of harmful components.</p>

          <hr className="legal-divider"/>

          <h2>13. Indemnification</h2>
          <p>You agree to indemnify, defend, and hold harmless PlumBoost and its affiliates, officers, directors, employees, and agents from any claims, damages, losses, liabilities, costs, and expenses (including reasonable legal fees) arising from your use of the Service, Your Data, or your violation of these Terms.</p>

          <hr className="legal-divider"/>

          <h2>14. Governing Law and Disputes</h2>
          <p>These Terms are governed by and construed in accordance with the laws of the State of Florida, United States, without regard to conflict of law principles. Any dispute arising from these Terms shall be resolved through binding arbitration in Boca Raton, Florida, except that either party may seek injunctive relief in a court of competent jurisdiction to prevent irreparable harm.</p>

          <h2>15. Changes to These Terms</h2>
          <p>We may update these Terms from time to time. We will notify you of material changes by email and by posting the updated Terms on this page with a revised "Last updated" date. Your continued use of the Service after changes are posted constitutes acceptance of the new Terms. If you do not agree to the updated Terms, you must stop using the Service.</p>

          <h2>16. Entire Agreement</h2>
          <p>These Terms, together with our Privacy Policy and Cookie Policy, constitute the entire agreement between you and PlumBoost regarding the Service and supersede all prior agreements.</p>

          <hr className="legal-divider"/>

          <div className="legal-contact">
            <p><strong style={{ color: "#F1F5F9" }}>Questions about these Terms?</strong><br/>
            Contact us at <a href="mailto:legal@plumboost.com" style={{ color: "#A855F7" }}>legal@plumboost.com</a>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
