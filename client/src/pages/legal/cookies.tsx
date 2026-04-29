import { useLocation } from "wouter";

export default function CookiePolicy() {
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
        .legal-body p{font-size:15px;color:#94A3B8;line-height:1.75;margin-bottom:16px}
        .legal-body ul{padding-left:20px;margin-bottom:16px}
        .legal-body li{font-size:15px;color:#94A3B8;line-height:1.75;margin-bottom:6px}
        .legal-body a{color:#A855F7;text-decoration:none}
        .legal-body a:hover{text-decoration:underline}
        .legal-divider{border:none;border-top:1px solid rgba(255,255,255,0.07);margin:40px 0}
        .legal-contact{background:#0D1424;border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:24px;margin-top:48px}
        .legal-contact p{margin:0;font-size:14px;color:#94A3B8}
        .cookie-table{width:100%;border-collapse:collapse;margin-bottom:24px;font-size:14px}
        .cookie-table th{text-align:left;padding:10px 14px;background:#0D1424;color:#CBD5E1;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.07)}
        .cookie-table td{padding:10px 14px;color:#94A3B8;border-bottom:1px solid rgba(255,255,255,0.05)}
        .cookie-table tr:last-child td{border-bottom:none}
      `}</style>

      <div className="legal-wrap">
        <button className="legal-back" onClick={() => navigate("/")}>← Back to PlumBoost</button>

        <div className="legal-badge">Legal</div>
        <h1 className="legal-title">Cookie Policy</h1>
        <div className="legal-date">Last updated: {updated}</div>

        <div className="legal-body">
          <p>This Cookie Policy explains how PlumBoost uses cookies and similar technologies when you visit plumboost.com or use the PlumBoost platform. By using the Service, you consent to the use of cookies as described in this policy.</p>

          <hr className="legal-divider"/>

          <h2>1. What Are Cookies?</h2>
          <p>Cookies are small text files placed on your device by a website when you visit it. They are widely used to make websites work efficiently, remember your preferences, and provide basic analytics to site operators.</p>
          <p>Similar technologies include local storage, session storage, and pixels — we refer to all of these collectively as "cookies" in this policy.</p>

          <h2>2. What Cookies We Use</h2>
          <p>PlumBoost uses a minimal set of cookies. We do <strong>not</strong> use advertising cookies, cross-site tracking cookies, or third-party analytics cookies. Here is what we do use:</p>

          <table className="cookie-table">
            <thead>
              <tr>
                <th>Cookie Name</th>
                <th>Type</th>
                <th>Purpose</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>connect.sid</code></td>
                <td>Strictly Necessary</td>
                <td>Session authentication. Keeps you logged in to the PlumBoost platform. Set by our Express server using express-session.</td>
                <td>30 days (or until logout)</td>
              </tr>
              <tr>
                <td>Theme preference</td>
                <td>Functional</td>
                <td>Stores your light/dark mode preference so it persists across sessions. Stored in localStorage, not transmitted to our servers.</td>
                <td>Persistent (until cleared)</td>
              </tr>
            </tbody>
          </table>

          <h2>3. Cookie Categories</h2>

          <p><strong style={{ color: "#F1F5F9" }}>Strictly Necessary Cookies</strong><br/>
          These cookies are required for the Service to function. Without them, you cannot log in or use authenticated features. They cannot be disabled without breaking core functionality. We use one strictly necessary cookie: the session cookie (<code>connect.sid</code>).</p>

          <p><strong style={{ color: "#F1F5F9" }}>Functional Cookies</strong><br/>
          These cookies remember your preferences (such as light or dark mode) to improve your experience. They do not track you across websites.</p>

          <p><strong style={{ color: "#F1F5F9" }}>What We Do NOT Use</strong></p>
          <ul>
            <li>Analytics cookies (e.g., Google Analytics, Hotjar)</li>
            <li>Advertising or targeting cookies</li>
            <li>Social media tracking pixels</li>
            <li>Cross-site tracking of any kind</li>
          </ul>

          <hr className="legal-divider"/>

          <h2>4. Third-Party Cookies</h2>
          <p>When you complete a payment via Stripe, Stripe may set their own cookies on their checkout pages. These are governed by <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">Stripe's Privacy Policy</a>. We do not control or have access to Stripe's cookies.</p>
          <p>Cloudflare, our CDN and security provider, may set cookies for security purposes (e.g., bot detection). These are strictly necessary for service delivery. See <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer">Cloudflare's Privacy Policy</a>.</p>

          <hr className="legal-divider"/>

          <h2>5. Managing Cookies</h2>
          <p>You can control and manage cookies through your browser settings. Most browsers allow you to:</p>
          <ul>
            <li>View cookies stored on your device</li>
            <li>Block cookies from specific websites</li>
            <li>Delete cookies at any time</li>
            <li>Set preferences for first-party vs. third-party cookies</li>
          </ul>
          <p>Please note that blocking or deleting the session cookie (<code>connect.sid</code>) will log you out of the Service and prevent you from logging back in until the cookie is re-set.</p>
          <p>For guidance on managing cookies in your browser:</p>
          <ul>
            <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Chrome</a></li>
            <li><a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" target="_blank" rel="noopener noreferrer">Firefox</a></li>
            <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer">Safari</a></li>
            <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer">Edge</a></li>
          </ul>

          <hr className="legal-divider"/>

          <h2>6. Your Consent</h2>
          <p>By using the PlumBoost Service, you consent to the placement of strictly necessary cookies. As we only use one optional cookie (theme preference stored locally), and we do not use any advertising or analytics cookies, no additional consent banner is currently required under most jurisdictions.</p>
          <p>If we introduce additional cookies in the future, we will update this policy and, where required by law, request your consent.</p>

          <h2>7. Changes to This Policy</h2>
          <p>We may update this Cookie Policy from time to time. Changes will be posted on this page with a revised "Last updated" date. Your continued use of the Service constitutes acceptance of the updated policy.</p>

          <hr className="legal-divider"/>

          <div className="legal-contact">
            <p><strong style={{ color: "#F1F5F9" }}>Questions about cookies?</strong><br/>
            Contact us at <a href="mailto:privacy@plumboost.com" style={{ color: "#A855F7" }}>privacy@plumboost.com</a>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
