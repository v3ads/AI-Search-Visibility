import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useProjectContext } from "@/lib/project-context";
import { useToast } from "@/hooks/use-toast";
import { Globe, Building2, X, Plus, ChevronRight, ChevronLeft, Sparkles, Loader2, Check, Zap } from "lucide-react";

const INDUSTRIES = [
  "SaaS / Software", "E-commerce / Retail", "Finance / Fintech",
  "Healthcare / MedTech", "Marketing / Agencies", "Education / EdTech",
  "Real Estate", "Travel / Hospitality", "Legal / Professional Services",
  "Media / Publishing", "Cloud Infrastructure", "Other",
];

const COUNTRIES = [
  { value: "US", label: "United States" }, { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" }, { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" }, { value: "FR", label: "France" },
  { value: "IN", label: "India" }, { value: "SG", label: "Singapore" },
  { value: "AE", label: "UAE" }, { value: "OTHER", label: "Other" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  prefill?: { brand: string; domain: string; industry: string };
}

export function CreateProjectWizard({ open, onClose, prefill }: Props) {
  const { createProject } = useProjectContext();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  // Start at step 2 if prefill data exists — user already did the demo
  const [step, setStep] = useState(prefill ? 2 : 1);
  const [loading, setLoading] = useState(false);

  // Step 1 — Brand basics (pre-filled from demo if available)
  const [domain, setDomain] = useState(prefill?.domain ?? "");
  const [brandName, setBrandName] = useState(prefill?.brand ?? "");
  const [industry, setIndustry] = useState(prefill?.industry ?? "");
  const [country, setCountry] = useState("US");

  // Step 2 — Competitors
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [competitorInput, setCompetitorInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Step 3 — Prompt suggestions (after project created)
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [promptSuggestions, setPromptSuggestions] = useState<string[]>([]);
  const [selectedPrompts, setSelectedPrompts] = useState<Set<string>>(new Set());
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [addingPrompts, setAddingPrompts] = useState(false);

  // Auto-fetch competitors when wizard opens with prefill (step 1 is skipped)
  useEffect(() => {
    if (open && prefill && step === 2 && suggestions.length === 0 && !loadingSuggestions) {
      fetchCompetitorSuggestions();
    }
  }, [open]);  // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCompetitorSuggestions = async () => {
    setLoadingSuggestions(true);
    setSuggestions([]);
    try {
      const res = await fetch("/api/suggest-competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ brandName: brandName.trim(), domain: domain.trim(), industry }),
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions((data.competitors || []).filter((s: string) => !competitors.includes(s)));
      }
    } catch { /* non-fatal */ }
    finally { setLoadingSuggestions(false); }
  };

  const addSuggestion = (name: string) => {
    if (!competitors.includes(name)) setCompetitors([...competitors, name]);
    setSuggestions(suggestions.filter((s) => s !== name));
  };

  const addCompetitor = () => {
    const val = competitorInput.trim();
    if (val && !competitors.includes(val)) setCompetitors([...competitors, val]);
    setCompetitorInput("");
  };

  const removeCompetitor = (name: string) => setCompetitors(competitors.filter((c) => c !== name));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); addCompetitor(); }
  };

  // ── Step 2 → create project + fetch prompts ───────────────────────────────────

  const handleCreate = async () => {
    setLoading(true);
    try {
      const project = await createProject({
        domain: domain.trim().replace(/^https?:\/\//, "").replace(/\/$/, ""),
        brandName: brandName.trim(),
        industry: industry || null,
        country,
        language: "en",
      });

      // Add competitors
      if (competitors.length > 0) {
        await Promise.all(
          competitors.map((name) =>
            fetch(`/api/projects/${project.id}/competitors`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ brandName: name }),
            })
          )
        );
      }

      setCreatedProjectId(project.id);
      setStep(3);

      // Fetch AI-generated prompt suggestions in background
      setLoadingPrompts(true);
      try {
        const res = await fetch(`/api/projects/${project.id}/prompts/suggest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({}),
        });
        if (res.ok) {
          const data = await res.json();
          const prompts: string[] = data.prompts || [];
          setPromptSuggestions(prompts);
          // Pre-select all by default
          setSelectedPrompts(new Set(prompts));
        }
      } catch { /* non-fatal */ }
      finally { setLoadingPrompts(false); }

    } catch (err: any) {
      toast({ title: "Failed to create project", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3 — add selected prompts then finish ─────────────────────────────────

  const togglePrompt = (p: string) => {
    const next = new Set(selectedPrompts);
    next.has(p) ? next.delete(p) : next.add(p);
    setSelectedPrompts(next);
  };

  const handleFinish = async (addPrompts: boolean) => {
    if (addPrompts && selectedPrompts.size > 0 && createdProjectId) {
      setAddingPrompts(true);
      try {
        const res = await fetch(`/api/projects/${createdProjectId}/prompts/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            lines: Array.from(selectedPrompts),
            intent: "informational",
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: "Failed to save prompts" }));
          toast({ title: "Prompts not saved", description: err.message + " You can add them manually from the Prompts page.", variant: "destructive" });
        }
      } catch {
        toast({ title: "Prompts not saved", description: "Network error — add them manually from the Prompts page.", variant: "destructive" });
      } finally {
        setAddingPrompts(false);
      }
    }
    toast({ title: "Project created!", description: `${brandName} is ready to monitor.` });
    const projectId = createdProjectId;
    handleClose();
    if (projectId) navigate(`/projects/${projectId}`);
  };

  const handleClose = () => {
    setStep(prefill ? 2 : 1);
    setDomain(prefill?.domain ?? "");
    setBrandName(prefill?.brand ?? "");
    setIndustry(prefill?.industry ?? "");
    setCountry("US");
    setCompetitors([]); setCompetitorInput(""); setSuggestions([]); setLoadingSuggestions(false);
    setCreatedProjectId(null); setPromptSuggestions([]); setSelectedPrompts(new Set());
    setLoadingPrompts(false); setAddingPrompts(false);
    onClose();
  };

  const canProceedStep1 = domain.trim() && brandName.trim();
  const TOTAL_STEPS = prefill ? 2 : 3;
  const progressPct = prefill
    ? (step === 2 ? 50 : 100)
    : (step === 1 ? 33 : step === 2 ? 66 : 100);
  const displayStep = prefill ? step - 1 : step;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground font-medium">Step {displayStep} of {TOTAL_STEPS}</span>
          </div>
          <DialogTitle className="text-xl">
            {step === 1 ? "Set up your brand"
              : step === 2
              ? prefill ? `Continuing your scan for ${prefill.brand}` : "Add competitors"
              : "AI-suggested prompts"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {step === 1
              ? "Tell us about the brand you want to monitor in AI search results."
              : step === 2
              ? prefill
                ? `We've pre-filled your details from the demo. Add competitors to track alongside ${prefill.brand}.`
                : "Add the brands you compete with. We'll track their AI visibility alongside yours."
              : "We analysed your website and generated prompts your customers actually use."}
          </p>
        </DialogHeader>

        {/* Progress bar */}
        <div className="w-full h-1 bg-muted rounded-full mt-1">
          <div className="h-1 bg-primary rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>

        {/* ── Step 1: Brand basics ── */}
        {step === 1 && (
          <div className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="domain" className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Domain
              </Label>
              <Input id="domain" placeholder="e.g. yourcompany.com" value={domain}
                onChange={(e) => setDomain(e.target.value)} autoFocus />
              <p className="text-xs text-muted-foreground">No need to include https://</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="brand" className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Brand Name
              </Label>
              <Input id="brand" placeholder="e.g. Acme Corp" value={brandName}
                onChange={(e) => setBrandName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Industry</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => { setStep(2); fetchCompetitorSuggestions(); }} disabled={!canProceedStep1}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Competitors ── */}
        {step === 2 && (
          <div className="space-y-4 mt-4">
            {loadingSuggestions && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-md border border-dashed p-3">
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span>Finding competitors for <strong>{brandName}</strong>…</span>
              </div>
            )}

            {!loadingSuggestions && suggestions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Suggested competitors — click to add</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((name) => (
                    <button key={name} onClick={() => addSuggestion(name)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors">
                      <Plus className="w-3 h-3" />{name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Competitor Brands</Label>
              <div className="flex gap-2">
                <Input placeholder="e.g. CompetitorName" value={competitorInput}
                  onChange={(e) => setCompetitorInput(e.target.value)}
                  onKeyDown={handleKeyDown} autoFocus />
                <Button variant="outline" size="icon" onClick={addCompetitor} disabled={!competitorInput.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Press Enter or click + to add. You can add more later.</p>
            </div>

            {competitors.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {competitors.map((name) => (
                  <Badge key={name} variant="secondary" className="gap-1 pr-1">
                    {name}
                    <button onClick={() => removeCompetitor(name)} className="ml-0.5 rounded-full hover:bg-muted p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {competitors.length === 0 && !loadingSuggestions && suggestions.length === 0 && (
              <div className="rounded-md border border-dashed p-4 text-center">
                <p className="text-sm text-muted-foreground">No competitors added yet.</p>
                <p className="text-xs text-muted-foreground mt-0.5">You can skip this and add them later in Settings.</p>
              </div>
            )}

            <div className="flex justify-between pt-2">
              {prefill ? (
                <div /> // No back button when coming from demo — step 1 is pre-filled
              ) : (
                <Button variant="ghost" onClick={() => setStep(1)}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              )}
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : <>Create Project <ChevronRight className="w-4 h-4 ml-1" /></>}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: AI Prompt Suggestions ── */}
        {step === 3 && (
          <div className="space-y-4 mt-4">
            {loadingPrompts && (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                <p className="text-sm text-muted-foreground">
                  Analysing <strong>{domain}</strong> to generate relevant prompts…
                </p>
                <p className="text-xs text-muted-foreground">This usually takes 10–15 seconds</p>
              </div>
            )}

            {!loadingPrompts && promptSuggestions.length > 0 && (
              <>
                <div className="flex items-center gap-2 rounded-md bg-primary/5 border border-primary/20 p-3">
                  <Sparkles className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Generated from your website — these are the queries your customers actually use.
                    Select the ones to add.
                  </p>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {promptSuggestions.map((p) => {
                    const selected = selectedPrompts.has(p);
                    return (
                      <button
                        key={p}
                        onClick={() => togglePrompt(p)}
                        className={`w-full text-left text-sm p-3 rounded-md border transition-all flex items-start gap-2.5 ${
                          selected
                            ? "border-primary/40 bg-primary/5 text-foreground"
                            : "border-border bg-card text-muted-foreground hover:border-primary/20"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 border ${
                          selected ? "bg-primary border-primary" : "border-muted-foreground/30"
                        }`}>
                          {selected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                        </div>
                        <span className="leading-snug">{p}</span>
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs text-muted-foreground">
                  {selectedPrompts.size} of {promptSuggestions.length} selected — you can edit these anytime in the Prompts tab.
                </p>
              </>
            )}

            {!loadingPrompts && promptSuggestions.length === 0 && (
              <div className="rounded-md border border-dashed p-6 text-center">
                <Zap className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No prompt suggestions available.</p>
                <p className="text-xs text-muted-foreground mt-1">You can add prompts manually in the Prompts tab after setup.</p>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => handleFinish(false)} disabled={addingPrompts}>
                Skip
              </Button>
              <Button
                onClick={() => handleFinish(true)}
                disabled={addingPrompts || loadingPrompts || selectedPrompts.size === 0}
              >
                {addingPrompts
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding…</>
                  : selectedPrompts.size > 0
                  ? <>Add {selectedPrompts.size} Prompt{selectedPrompts.size !== 1 ? "s" : ""} & Finish</>
                  : "Finish"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
