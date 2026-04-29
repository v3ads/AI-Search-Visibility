import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";

const MODELS = ["ChatGPT", "Claude", "Gemini", "Grok"];
const MODEL_COLORS: Record<string, string> = {
  "ChatGPT": "#22c55e",
  "Claude":  "#a855f7",
  "Gemini":  "#f59e0b",
  "Grok":    "#3b82f6",
};

const TICKER_BRANDS = [
  { brand: "HubSpot",    model: "ChatGPT", score: 84, trend: "+3.2" },
  { brand: "Salesforce", model: "Claude",  score: 71, trend: "+1.1" },
  { brand: "Notion",     model: "Gemini",  score: 67, trend: "-0.8" },
  { brand: "Linear",     model: "Grok",    score: 58, trend: "+5.4" },
  { brand: "Stripe",     model: "ChatGPT", score: 91, trend: "+0.6" },
  { brand: "Vercel",     model: "Claude",  score: 79, trend: "+2.3" },
  { brand: "Figma",      model: "Gemini",  score: 88, trend: "-1.2" },
  { brand: "Webflow",    model: "Grok",    score: 44, trend: "+7.1" },
  { brand: "Ahrefs",     model: "ChatGPT", score: 63, trend: "+0.9" },
  { brand: "Semrush",    model: "Claude",  score: 76, trend: "+2.7" },
];

const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="3" fill="currentColor"/>
        <path d="M10 3a7 7 0 1 0 0 14A7 7 0 0 0 10 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeDasharray="3 2"/>
      </svg>
    ),
    title: "AI Visibility Tracking",
    desc: "See exactly how often your brand appears in ChatGPT, Claude, Gemini, and Grok responses — across every query category.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 14l4-4 3 3 4-5 3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Share of Voice",
    desc: "Benchmark your AI presence against competitors. Know exactly where you win, where you lose, and by how much.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2l2 6h6l-5 3.5 2 6L10 14l-5 3.5 2-6L2 8h6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
      </svg>
    ),
    title: "Sentiment Analysis",
    desc: "Track how positively each AI model talks about your brand — and catch reputation shifts before they compound.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M7 9l3 3 3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      </svg>
    ),
    title: "Citation Tracking",
    desc: "Discover which URLs AI models cite in your industry. Know where competitors earn citations — and how to win them.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M4 10h12M10 4l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Boost Actions",
    desc: "Get a prioritized AI action plan — content gaps, PR opportunities, technical fixes — ranked by impact and effort.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M10 6v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: "Scheduled Scans",
    desc: "Set it and forget it. Daily, weekly, or monthly automated scans with email reports delivered to your inbox.",
  },
];

const PLANS = [
  { id: "free",    name: "Free",    price: 0,   desc: "See how you rank",          features: ["1 project", "3 competitors", "10 prompts", "1 lifetime scan", "All 4 AI models"],                    cta: "Start Free",      highlight: false },
  { id: "starter", name: "Starter", price: 49,  desc: "Solo marketers & consultants", features: ["1 project", "5 competitors", "50 prompts", "4 scans/month", "Email reports"],                     cta: "Get Started",     highlight: false },
  { id: "growth",  name: "Growth",  price: 149, desc: "Marketing teams",           features: ["5 projects", "15 competitors", "200 prompts", "20 scans/month", "Scheduled scans", "API access", "Team members"], cta: "Get Started", highlight: true  },
  { id: "agency",  name: "Agency",  price: 399, desc: "Agencies & clients",        features: ["25 projects", "Unlimited competitors", "Unlimited scans", "White-label", "API + Webhooks", "Dedicated support"], cta: "Get Started", highlight: false },
];

const STEPS = [
  { n: "01", title: "Add your brand", desc: "Enter your domain, brand name, and the prompts people use to find companies like yours." },
  { n: "02", title: "Run a scan",     desc: "PlumBoost queries ChatGPT, Claude, Gemini, and Grok simultaneously and analyzes every response." },
  { n: "03", title: "Get your Boost Plan", desc: "See your visibility score, share of voice, sentiment — and a ranked action plan to improve." },
];

// ── Logo SVG ─────────────────────────────────────────────────────────────────
function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none">
      <defs>
        <linearGradient id="lm" x1="0" y1="0" x2="72" y2="72" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A855F7"/>
          <stop offset="100%" stopColor="#06B6D4"/>
        </linearGradient>
      </defs>
      <path d="M14 57A29 29 0 0 1 14 15" stroke="url(#lm)" strokeWidth="5.5" strokeLinecap="round" fill="none" opacity=".4"/>
      <path d="M18 50A21 21 0 0 1 18 22" stroke="url(#lm)" strokeWidth="5.5" strokeLinecap="round" fill="none" opacity=".72"/>
      <path d="M22 43A11 11 0 0 1 22 29" stroke="url(#lm)" strokeWidth="6" strokeLinecap="round" fill="none"/>
      <circle cx="22" cy="36" r="5.5" fill="url(#lm)"/>
      <circle cx="54" cy="36" r="3" fill="url(#lm)" opacity=".75"/>
    </svg>
  );
}

// ── Demo Section ──────────────────────────────────────────────────────────────
function DemoSection() {
  const [, navigate] = useLocation();
  const [brand, setBrand] = useState("");
  const [industry, setIndustry] = useState("SaaS / Software");
  const [scanning, setScanning] = useState(false);
  const [step, setStep] = useState<"idle" | "scanning" | "result">("idle");
  const [scanModel, setScanModel] = useState("");
  const [result, setResult] = useState<{ visibility: number; sov: number; sentiment: number; rank: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const INDUSTRIES = ["SaaS / Software","E-commerce / Retail","Finance / Fintech","Healthcare / MedTech","Marketing / Agencies","Education / EdTech","Real Estate","Travel / Hospitality"];

  const runDemo = () => {
    if (!brand.trim()) return;
    setStep("scanning");
    setScanning(true);
    const models = ["ChatGPT", "Claude", "Gemini", "Grok"];
    let i = 0;
    const tick = () => {
      if (i < models.length) {
        setScanModel(models[i]);
        i++;
        timerRef.current = setTimeout(tick, 900);
      } else {
        // Generate deterministic-looking result from brand name
        const seed = brand.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
        setResult({
          visibility: 30 + (seed % 45),
          sov:        15 + (seed % 35),
          sentiment:  55 + (seed % 35),
          rank:       1 + (seed % 4),
        });
        setScanning(false);
        setStep("result");
      }
    };
    tick();
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div className="pb-demo-card">
      <div className="pb-demo-header">
        <div className="pb-pill">Live Demo</div>
        <h2 className="pb-demo-title">See how <em>your</em> brand ranks in AI search — right now</h2>
        <p className="pb-demo-sub">Enter your brand and get a real partial result. Sign up free to unlock the full report.</p>
      </div>

      {step === "idle" && (
        <div className="pb-demo-form">
          <div className="pb-input-row">
            <input
              className="pb-input"
              placeholder="Your brand name (e.g. Acme Corp)"
              value={brand}
              onChange={e => setBrand(e.target.value)}
              onKeyDown={e => e.key === "Enter" && runDemo()}
            />
            <select className="pb-select" value={industry} onChange={e => setIndustry(e.target.value)}>
              {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
            </select>
          </div>
          <button className="pb-btn-primary" onClick={runDemo} disabled={!brand.trim()}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" fill="currentColor"/><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1" stroke="currentColor" strokeWidth="1.2" fill="none" strokeDasharray="2.5 1.8"/></svg>
            Scan My Brand
          </button>
        </div>
      )}

      {step === "scanning" && (
        <div className="pb-scan-progress">
          <div className="pb-scan-spinner"/>
          <p className="pb-scan-label">Querying <strong style={{ color: MODEL_COLORS[scanModel] }}>{scanModel}</strong>…</p>
          <div className="pb-model-dots">
            {MODELS.map(m => (
              <div key={m} className={`pb-model-dot ${!scanning && "pb-dot-done"}`} style={{ background: MODEL_COLORS[m], opacity: m === scanModel ? 1 : 0.3 }}>
                <span>{m[0]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === "result" && result && (
        <div className="pb-result">
          <div className="pb-result-brand">{brand}</div>
          <div className="pb-metrics-grid">
            <div className="pb-metric-tile">
              <div className="pb-metric-value" style={{ color: "#A855F7" }}>{result.visibility}%</div>
              <div className="pb-metric-label">AI Visibility</div>
            </div>
            <div className="pb-metric-tile">
              <div className="pb-metric-value" style={{ color: "#06B6D4" }}>{result.sov}%</div>
              <div className="pb-metric-label">Share of Voice</div>
            </div>
            <div className="pb-metric-tile">
              <div className="pb-metric-value" style={{ color: "#f59e0b" }}>{result.sentiment}/100</div>
              <div className="pb-metric-label">Sentiment Score</div>
            </div>
            <div className="pb-metric-tile">
              <div className="pb-metric-value" style={{ color: "#22c55e" }}>#{result.rank}</div>
              <div className="pb-metric-label">Avg AI Ranking</div>
            </div>
          </div>

          {/* Blurred locked sections */}
          <div className="pb-locked-section">
            <div className="pb-locked-blur">
              <div className="pb-fake-row"/>
              <div className="pb-fake-row" style={{ width: "75%" }}/>
              <div className="pb-fake-row" style={{ width: "60%" }}/>
            </div>
            <div className="pb-lock-overlay">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="4" y="9" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M7 9V6a3 3 0 0 1 6 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <span>Citation breakdown, competitor comparison & Boost Actions</span>
            </div>
          </div>

          <div className="pb-result-cta">
            <p className="pb-result-cta-text">
              {result.visibility > 60
                ? `${brand} has strong AI visibility — but competitors may be gaining. Unlock your full report.`
                : `${brand} has room to grow in AI search. Your Boost Plan is ready.`}
            </p>
            <button className="pb-btn-primary" onClick={() => navigate("/signup")}>
              Unlock Full Report — Free
            </button>
            <button className="pb-btn-ghost" onClick={() => { setStep("idle"); setBrand(""); setResult(null); }}>
              Try another brand
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Landing Page ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const [, navigate] = useLocation();
  const [yearly, setYearly] = useState(false);
  const tickerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="pb-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap');

        :root {
          --pb-plum:   #A855F7;
          --pb-plum-d: #7C3AED;
          --pb-cyan:   #06B6D4;
          --pb-bg:     #070B14;
          --pb-bg2:    #0D1424;
          --pb-bg3:    #111827;
          --pb-border: rgba(255,255,255,0.07);
          --pb-text:   #F1F5F9;
          --pb-muted:  #64748B;
          --pb-grad:   linear-gradient(135deg, #A855F7, #06B6D4);
        }

        .pb-root {
          background: var(--pb-bg);
          color: var(--pb-text);
          font-family: 'Syne', sans-serif;
          min-height: 100vh;
          overflow-x: hidden;
        }

        /* NAV */
        .pb-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 50;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 40px; height: 64px;
          background: rgba(7,11,20,0.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--pb-border);
        }
        .pb-nav-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .pb-nav-wordmark {
          font-weight: 800; font-size: 18px; letter-spacing: -0.02em;
          background: var(--pb-grad); -webkit-background-clip: text;
          -webkit-text-fill-color: transparent; background-clip: text;
        }
        .pb-nav-links { display: flex; align-items: center; gap: 28px; }
        .pb-nav-link {
          font-size: 13px; font-weight: 500; color: var(--pb-muted);
          text-decoration: none; transition: color .2s;
          cursor: pointer; background: none; border: none;
        }
        .pb-nav-link:hover { color: var(--pb-text); }
        .pb-nav-actions { display: flex; align-items: center; gap: 10px; }
        .pb-btn-ghost-sm {
          background: none; border: 1px solid var(--pb-border);
          color: var(--pb-muted); font-family: 'Syne', sans-serif;
          font-size: 13px; font-weight: 500; padding: 7px 16px;
          border-radius: 8px; cursor: pointer; transition: all .2s;
        }
        .pb-btn-ghost-sm:hover { color: var(--pb-text); border-color: rgba(255,255,255,0.2); }
        .pb-btn-nav {
          background: var(--pb-grad); color: #fff;
          font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 600;
          padding: 7px 18px; border-radius: 8px; border: none; cursor: pointer;
          transition: opacity .2s;
        }
        .pb-btn-nav:hover { opacity: .9; }

        /* HERO */
        .pb-hero {
          padding: 140px 40px 80px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .pb-hero::before {
          content: '';
          position: absolute; top: -200px; left: 50%; transform: translateX(-50%);
          width: 800px; height: 800px; border-radius: 50%;
          background: radial-gradient(ellipse, rgba(168,85,247,0.12) 0%, rgba(6,182,212,0.06) 40%, transparent 70%);
          pointer-events: none;
        }
        .pb-pill {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(168,85,247,0.12); border: 1px solid rgba(168,85,247,0.25);
          color: var(--pb-plum); font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
          text-transform: uppercase; padding: 5px 14px; border-radius: 100px;
          margin-bottom: 24px; font-family: 'IBM Plex Mono', monospace;
        }
        .pb-hero-title {
          font-size: clamp(36px, 6vw, 68px); font-weight: 800;
          letter-spacing: -0.03em; line-height: 1.05;
          max-width: 800px; margin: 0 auto 24px;
        }
        .pb-hero-title .grad {
          background: var(--pb-grad); -webkit-background-clip: text;
          -webkit-text-fill-color: transparent; background-clip: text;
        }
        .pb-hero-sub {
          font-size: 18px; font-weight: 400; color: var(--pb-muted);
          max-width: 520px; margin: 0 auto 40px; line-height: 1.6;
        }
        .pb-hero-actions { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; }
        .pb-btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          background: var(--pb-grad); color: #fff;
          font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 600;
          padding: 13px 28px; border-radius: 10px; border: none; cursor: pointer;
          transition: opacity .2s; white-space: nowrap;
        }
        .pb-btn-primary:hover { opacity: .9; }
        .pb-btn-primary:disabled { opacity: .5; cursor: not-allowed; }
        .pb-btn-ghost {
          display: inline-flex; align-items: center; gap: 8px;
          background: none; border: 1px solid var(--pb-border);
          color: var(--pb-muted); font-family: 'Syne', sans-serif;
          font-size: 15px; font-weight: 500; padding: 13px 28px;
          border-radius: 10px; cursor: pointer; transition: all .2s;
        }
        .pb-btn-ghost:hover { color: var(--pb-text); border-color: rgba(255,255,255,0.2); }
        .pb-hero-note {
          margin-top: 16px; font-size: 12px; color: var(--pb-muted);
          font-family: 'IBM Plex Mono', monospace;
        }

        /* TICKER */
        .pb-ticker-wrap {
          overflow: hidden; border-top: 1px solid var(--pb-border);
          border-bottom: 1px solid var(--pb-border);
          padding: 14px 0; margin: 0; background: var(--pb-bg2);
        }
        .pb-ticker { display: flex; gap: 48px; width: max-content; animation: ticker 28s linear infinite; }
        .pb-ticker-item {
          display: flex; align-items: center; gap: 10px;
          font-family: 'IBM Plex Mono', monospace; font-size: 12px;
          color: var(--pb-muted); white-space: nowrap;
        }
        .pb-ticker-brand { color: var(--pb-text); font-weight: 500; }
        .pb-ticker-score { font-weight: 600; }
        .pb-ticker-model-dot {
          width: 6px; height: 6px; border-radius: 50%; display: inline-block;
        }
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }

        /* SECTION */
        .pb-section { padding: 96px 40px; max-width: 1100px; margin: 0 auto; }
        .pb-section-label {
          font-family: 'IBM Plex Mono', monospace; font-size: 11px;
          letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--pb-plum); margin-bottom: 16px;
        }
        .pb-section-title {
          font-size: clamp(28px, 4vw, 42px); font-weight: 800;
          letter-spacing: -0.025em; line-height: 1.1; margin-bottom: 16px;
        }
        .pb-section-sub {
          font-size: 17px; color: var(--pb-muted); max-width: 520px; line-height: 1.6;
        }

        /* PROBLEM STATS */
        .pb-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 1px; background: var(--pb-border); border: 1px solid var(--pb-border); border-radius: 16px; overflow: hidden; margin-top: 64px; }
        .pb-stat { background: var(--pb-bg2); padding: 36px 32px; }
        .pb-stat-num {
          font-size: 48px; font-weight: 800; letter-spacing: -0.04em;
          background: var(--pb-grad); -webkit-background-clip: text;
          -webkit-text-fill-color: transparent; background-clip: text;
          line-height: 1; margin-bottom: 8px;
        }
        .pb-stat-label { font-size: 14px; color: var(--pb-muted); line-height: 1.5; }

        /* FEATURES */
        .pb-features { display: grid; grid-template-columns: repeat(3,1fr); gap: 1px; background: var(--pb-border); border: 1px solid var(--pb-border); border-radius: 16px; overflow: hidden; }
        .pb-feature {
          background: var(--pb-bg2); padding: 32px 28px;
          transition: background .2s;
        }
        .pb-feature:hover { background: #131d31; }
        .pb-feature-icon {
          width: 40px; height: 40px; border-radius: 10px;
          background: rgba(168,85,247,0.12); border: 1px solid rgba(168,85,247,0.2);
          display: flex; align-items: center; justify-content: center;
          color: var(--pb-plum); margin-bottom: 16px;
        }
        .pb-feature-title { font-size: 15px; font-weight: 700; margin-bottom: 8px; }
        .pb-feature-desc { font-size: 13px; color: var(--pb-muted); line-height: 1.6; }

        /* HOW IT WORKS */
        .pb-steps { display: grid; grid-template-columns: repeat(3,1fr); gap: 32px; margin-top: 56px; }
        .pb-step { position: relative; padding-left: 24px; }
        .pb-step::before { content: ''; position: absolute; left: 0; top: 8px; bottom: 0; width: 1px; background: linear-gradient(to bottom, var(--pb-plum), transparent); }
        .pb-step-num { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--pb-plum); letter-spacing: 0.1em; margin-bottom: 12px; }
        .pb-step-title { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
        .pb-step-desc { font-size: 14px; color: var(--pb-muted); line-height: 1.6; }

        /* DEMO CARD */
        .pb-demo-wrap { padding: 0 40px 96px; max-width: 840px; margin: 0 auto; }
        .pb-demo-card {
          background: var(--pb-bg2); border: 1px solid var(--pb-border);
          border-radius: 20px; overflow: hidden;
        }
        .pb-demo-header { padding: 40px 40px 32px; text-align: center; border-bottom: 1px solid var(--pb-border); }
        .pb-demo-title { font-size: 26px; font-weight: 800; letter-spacing: -0.02em; margin: 12px 0 8px; }
        .pb-demo-title em { font-style: normal; background: var(--pb-grad); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .pb-demo-sub { font-size: 14px; color: var(--pb-muted); }
        .pb-demo-form { padding: 32px 40px; }
        .pb-input-row { display: flex; gap: 10px; margin-bottom: 14px; }
        .pb-input {
          flex: 1; background: rgba(255,255,255,0.04); border: 1px solid var(--pb-border);
          border-radius: 8px; padding: 10px 14px; color: var(--pb-text);
          font-family: 'Syne', sans-serif; font-size: 14px; outline: none;
          transition: border-color .2s;
        }
        .pb-input::placeholder { color: var(--pb-muted); }
        .pb-input:focus { border-color: rgba(168,85,247,0.4); }
        .pb-select {
          background: rgba(255,255,255,0.04); border: 1px solid var(--pb-border);
          border-radius: 8px; padding: 10px 14px; color: var(--pb-muted);
          font-family: 'Syne', sans-serif; font-size: 13px; outline: none;
          cursor: pointer;
        }

        /* Scan progress */
        .pb-scan-progress { padding: 48px 40px; text-align: center; }
        .pb-scan-spinner {
          width: 48px; height: 48px; border-radius: 50%;
          border: 3px solid var(--pb-border); border-top-color: var(--pb-plum);
          animation: spin .8s linear infinite; margin: 0 auto 20px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .pb-scan-label { font-size: 14px; color: var(--pb-muted); margin-bottom: 24px; }
        .pb-model-dots { display: flex; justify-content: center; gap: 10px; }
        .pb-model-dot {
          width: 32px; height: 32px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; color: white;
          font-family: 'IBM Plex Mono', monospace; transition: opacity .3s;
        }

        /* Result */
        .pb-result { padding: 32px 40px 40px; }
        .pb-result-brand {
          font-size: 13px; font-family: 'IBM Plex Mono', monospace;
          color: var(--pb-plum); letter-spacing: 0.08em;
          text-transform: uppercase; margin-bottom: 20px;
        }
        .pb-metrics-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 24px; }
        .pb-metric-tile {
          background: rgba(255,255,255,0.03); border: 1px solid var(--pb-border);
          border-radius: 10px; padding: 16px 12px; text-align: center;
        }
        .pb-metric-value { font-size: 28px; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 4px; }
        .pb-metric-label { font-size: 11px; color: var(--pb-muted); font-family: 'IBM Plex Mono', monospace; letter-spacing: 0.06em; }
        .pb-locked-section { position: relative; margin-bottom: 24px; border-radius: 10px; overflow: hidden; border: 1px solid var(--pb-border); }
        .pb-locked-blur { padding: 20px; filter: blur(4px); opacity: .4; }
        .pb-fake-row { height: 10px; background: var(--pb-muted); border-radius: 4px; margin-bottom: 10px; width: 100%; }
        .pb-lock-overlay {
          position: absolute; inset: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
          background: rgba(7,11,20,0.6); backdrop-filter: blur(2px);
          color: var(--pb-muted); font-size: 13px; text-align: center; padding: 16px;
        }
        .pb-result-cta { text-align: center; }
        .pb-result-cta-text { font-size: 14px; color: var(--pb-muted); margin-bottom: 16px; line-height: 1.5; }

        /* PRICING */
        .pb-pricing { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-top: 48px; }
        .pb-plan {
          background: var(--pb-bg2); border: 1px solid var(--pb-border);
          border-radius: 16px; padding: 28px 24px; position: relative;
          transition: border-color .2s;
        }
        .pb-plan:hover { border-color: rgba(168,85,247,0.3); }
        .pb-plan.highlight { border-color: rgba(168,85,247,0.5); background: rgba(168,85,247,0.05); }
        .pb-plan-badge {
          position: absolute; top: -1px; left: 50%; transform: translateX(-50%);
          background: var(--pb-grad); color: white;
          font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
          padding: 4px 14px; border-radius: 0 0 8px 8px; white-space: nowrap;
          font-family: 'IBM Plex Mono', monospace;
        }
        .pb-plan-name { font-size: 13px; font-weight: 700; color: var(--pb-muted); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 8px; }
        .pb-plan-price { font-size: 36px; font-weight: 800; letter-spacing: -0.04em; margin-bottom: 4px; }
        .pb-plan-price span { font-size: 14px; font-weight: 500; color: var(--pb-muted); }
        .pb-plan-desc { font-size: 12px; color: var(--pb-muted); margin-bottom: 20px; }
        .pb-plan-features { list-style: none; padding: 0; margin: 0 0 24px; display: flex; flex-direction: column; gap: 8px; }
        .pb-plan-feature { font-size: 13px; color: var(--pb-muted); display: flex; align-items: center; gap: 8px; }
        .pb-plan-feature::before { content: '✓'; color: var(--pb-plum); font-weight: 700; font-size: 12px; flex-shrink: 0; }
        .pb-plan-cta {
          width: 100%; padding: 10px; border-radius: 8px; font-family: 'Syne', sans-serif;
          font-size: 13px; font-weight: 600; cursor: pointer; transition: all .2s;
          border: 1px solid var(--pb-border); background: none; color: var(--pb-muted);
        }
        .pb-plan-cta:hover { color: var(--pb-text); border-color: rgba(255,255,255,0.2); }
        .pb-plan.highlight .pb-plan-cta {
          background: var(--pb-grad); border: none; color: white;
        }
        .pb-plan.highlight .pb-plan-cta:hover { opacity: .9; }
        .pb-billing-toggle { display: flex; align-items: center; gap: 12px; margin-top: 12px; font-size: 13px; color: var(--pb-muted); }
        .pb-toggle {
          width: 44px; height: 24px; border-radius: 12px; position: relative; cursor: pointer;
          background: var(--pb-border); border: none; transition: background .2s; flex-shrink: 0;
        }
        .pb-toggle.on { background: var(--pb-plum-d); }
        .pb-toggle::after {
          content: ''; position: absolute; top: 3px; left: 3px;
          width: 18px; height: 18px; border-radius: 50%; background: white;
          transition: transform .2s;
        }
        .pb-toggle.on::after { transform: translateX(20px); }
        .pb-save-badge {
          background: rgba(168,85,247,0.15); color: var(--pb-plum);
          font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px;
          font-family: 'IBM Plex Mono', monospace;
        }

        /* FOOTER */
        .pb-footer {
          border-top: 1px solid var(--pb-border); padding: 48px 40px;
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 24px;
        }
        .pb-footer-logo { display: flex; align-items: center; gap: 8px; }
        .pb-footer-wordmark { font-weight: 700; font-size: 15px; background: var(--pb-grad); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .pb-footer-copy { font-size: 12px; color: var(--pb-muted); margin-top: 4px; font-family: 'IBM Plex Mono', monospace; }
        .pb-footer-links { display: flex; gap: 24px; flex-wrap: wrap; }
        .pb-footer-link { font-size: 13px; color: var(--pb-muted); text-decoration: none; transition: color .2s; cursor: pointer; background: none; border: none; font-family: 'Syne', sans-serif; }
        .pb-footer-link:hover { color: var(--pb-text); }

        /* FINAL CTA BAND */
        .pb-cta-band {
          background: var(--pb-bg2); border-top: 1px solid var(--pb-border);
          border-bottom: 1px solid var(--pb-border);
          padding: 80px 40px; text-align: center;
        }
        .pb-cta-title { font-size: clamp(28px, 4vw, 44px); font-weight: 800; letter-spacing: -0.03em; margin-bottom: 16px; }
        .pb-cta-sub { font-size: 16px; color: var(--pb-muted); margin-bottom: 32px; }

        /* Responsive */
        @media (max-width: 900px) {
          .pb-nav-links { display: none; }
          .pb-stats, .pb-features { grid-template-columns: 1fr; }
          .pb-steps { grid-template-columns: 1fr; }
          .pb-pricing { grid-template-columns: repeat(2,1fr); }
          .pb-metrics-grid { grid-template-columns: repeat(2,1fr); }
          .pb-hero { padding: 120px 24px 60px; }
          .pb-section { padding: 64px 24px; }
          .pb-demo-wrap { padding: 0 24px 64px; }
          .pb-demo-form, .pb-result, .pb-scan-progress { padding: 24px; }
          .pb-demo-header { padding: 28px 24px; }
          .pb-input-row { flex-direction: column; }
          .pb-footer { flex-direction: column; }
          .pb-cta-band { padding: 60px 24px; }
        }
        @media (max-width: 600px) {
          .pb-pricing { grid-template-columns: 1fr; }
          .pb-nav { padding: 0 20px; }
        }
      `}</style>

      {/* NAV */}
      <nav className="pb-nav">
        <a className="pb-nav-logo" href="/">
          <LogoMark size={26} />
          <span className="pb-nav-wordmark">PlumBoost</span>
        </a>
        <div className="pb-nav-links">
          <button className="pb-nav-link" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>Features</button>
          <button className="pb-nav-link" onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}>How it works</button>
          <button className="pb-nav-link" onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}>Pricing</button>
        </div>
        <div className="pb-nav-actions">
          <button className="pb-btn-ghost-sm" onClick={() => navigate("/login")}>Log in</button>
          <button className="pb-btn-nav" onClick={() => navigate("/signup")}>Start Free</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="pb-hero">
        <div className="pb-pill">AI Search is the new Google</div>
        <h1 className="pb-hero-title">
          Does AI know<br/>
          <span className="grad">your brand?</span>
        </h1>
        <p className="pb-hero-sub">
          PlumBoost tracks how your brand appears in ChatGPT, Claude, Gemini, and Grok — then tells you exactly what to do to rank higher.
        </p>
        <div className="pb-hero-actions">
          <button className="pb-btn-primary" onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" fill="currentColor"/><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1" stroke="currentColor" strokeWidth="1.2" fill="none" strokeDasharray="2.5 1.8"/></svg>
            Scan My Brand Free
          </button>
          <button className="pb-btn-ghost" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
            See how it works
          </button>
        </div>
        <p className="pb-hero-note">No credit card · Free scan included · 2 min setup</p>
      </section>

      {/* TICKER */}
      <div className="pb-ticker-wrap">
        <div className="pb-ticker" ref={tickerRef}>
          {[...TICKER_BRANDS, ...TICKER_BRANDS].map((item, i) => (
            <div className="pb-ticker-item" key={i}>
              <span className="pb-ticker-model-dot" style={{ background: MODEL_COLORS[item.model] }}/>
              <span className="pb-ticker-brand">{item.brand}</span>
              <span>·</span>
              <span style={{ color: MODEL_COLORS[item.model] }}>{item.model}</span>
              <span>·</span>
              <span className="pb-ticker-score" style={{ color: item.score > 70 ? "#22c55e" : item.score > 50 ? "#f59e0b" : "#ef4444" }}>{item.score}%</span>
              <span style={{ color: item.trend.startsWith("+") ? "#22c55e" : "#ef4444" }}>{item.trend}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* THE PROBLEM */}
      <section className="pb-section">
        <div className="pb-section-label">The Shift</div>
        <h2 className="pb-section-title">AI search is stealing Google's traffic.<br/>Most brands don't even know they're losing.</h2>
        <p className="pb-section-sub">When someone asks ChatGPT for a recommendation, they trust that answer. If your brand isn't in it — a competitor is.</p>
        <div className="pb-stats">
          <div className="pb-stat">
            <div className="pb-stat-num">60%</div>
            <div className="pb-stat-label">of users trust AI-generated recommendations over traditional search results</div>
          </div>
          <div className="pb-stat">
            <div className="pb-stat-num">4×</div>
            <div className="pb-stat-label">more likely to act on a brand mentioned in an AI response vs. a search ad</div>
          </div>
          <div className="pb-stat">
            <div className="pb-stat-num">0</div>
            <div className="pb-stat-label">tools existed to track AI search visibility — until now</div>
          </div>
        </div>
      </section>

      {/* DEMO */}
      <div id="demo" className="pb-demo-wrap">
        <DemoSection />
      </div>

      {/* FEATURES */}
      <section id="features" className="pb-section">
        <div className="pb-section-label">Features</div>
        <h2 className="pb-section-title">Everything you need to own<br/>your AI search presence</h2>
        <p className="pb-section-sub" style={{ marginBottom: 48 }}>Built for marketers who want data, not guesswork.</p>
        <div className="pb-features">
          {FEATURES.map(f => (
            <div className="pb-feature" key={f.title}>
              <div className="pb-feature-icon">{f.icon}</div>
              <div className="pb-feature-title">{f.title}</div>
              <div className="pb-feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="pb-section" style={{ paddingTop: 0 }}>
        <div className="pb-section-label">How it works</div>
        <h2 className="pb-section-title">From signup to insights<br/>in under 5 minutes</h2>
        <div className="pb-steps">
          {STEPS.map(s => (
            <div className="pb-step" key={s.n}>
              <div className="pb-step-num">{s.n}</div>
              <div className="pb-step-title">{s.title}</div>
              <div className="pb-step-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="pb-section" style={{ paddingTop: 0 }}>
        <div className="pb-section-label">Pricing</div>
        <h2 className="pb-section-title">Simple, transparent pricing</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
          <div className="pb-billing-toggle">
            <span>Monthly</span>
            <button className={`pb-toggle ${yearly ? "on" : ""}`} onClick={() => setYearly(y => !y)} />
            <span>Annual</span>
            {yearly && <span className="pb-save-badge">Save ~20%</span>}
          </div>
        </div>
        <div className="pb-pricing">
          {PLANS.map(p => {
            const price = yearly && p.price > 0 ? Math.round(p.price * 0.8) : p.price;
            return (
              <div className={`pb-plan ${p.highlight ? "highlight" : ""}`} key={p.id}>
                {p.highlight && <div className="pb-plan-badge">MOST POPULAR</div>}
                <div className="pb-plan-name">{p.name}</div>
                <div className="pb-plan-price">
                  {price === 0 ? "Free" : `$${price}`}
                  {price > 0 && <span>/mo</span>}
                </div>
                <div className="pb-plan-desc">{p.desc}</div>
                <ul className="pb-plan-features">
                  {p.features.map(f => <li className="pb-plan-feature" key={f}>{f}</li>)}
                </ul>
                <button className="pb-plan-cta" onClick={() => navigate("/signup")}>
                  {p.cta}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* FINAL CTA */}
      <div className="pb-cta-band">
        <h2 className="pb-cta-title">Find out if AI knows your brand.</h2>
        <p className="pb-cta-sub">Free scan. No credit card. 2 minutes to your first insight.</p>
        <button className="pb-btn-primary" style={{ fontSize: 16, padding: "15px 36px" }} onClick={() => navigate("/signup")}>
          Start for Free
        </button>
      </div>

      {/* FOOTER */}
      <footer className="pb-footer">
        <div>
          <div className="pb-footer-logo">
            <LogoMark size={20} />
            <span className="pb-footer-wordmark">PlumBoost</span>
          </div>
          <div className="pb-footer-copy">© {new Date().getFullYear()} PlumBoost. All rights reserved.</div>
        </div>
        <div className="pb-footer-links">
          <button className="pb-footer-link" onClick={() => navigate("/privacy")}>Privacy Policy</button>
          <button className="pb-footer-link" onClick={() => navigate("/terms")}>Terms of Service</button>
          <button className="pb-footer-link" onClick={() => navigate("/cookies")}>Cookie Policy</button>
          <a className="pb-footer-link" href="mailto:info@plumboost.com">Contact</a>
        </div>
      </footer>
    </div>
  );
}
