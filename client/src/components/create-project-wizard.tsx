import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useProjectContext } from "@/lib/project-context";
import { useToast } from "@/hooks/use-toast";
import { Globe, Building2, X, Plus, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

const INDUSTRIES = [
  "SaaS / Software",
  "E-commerce / Retail",
  "Finance / Fintech",
  "Healthcare / MedTech",
  "Marketing / Agencies",
  "Education / EdTech",
  "Real Estate",
  "Travel / Hospitality",
  "Legal / Professional Services",
  "Media / Publishing",
  "Cloud Infrastructure",
  "Other",
];

const COUNTRIES = [
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "IN", label: "India" },
  { value: "SG", label: "Singapore" },
  { value: "AE", label: "UAE" },
  { value: "OTHER", label: "Other" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateProjectWizard({ open, onClose }: Props) {
  const { createProject } = useProjectContext();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 — Brand basics
  const [domain, setDomain] = useState("");
  const [brandName, setBrandName] = useState("");
  const [industry, setIndustry] = useState("");
  const [country, setCountry] = useState("US");

  // Step 2 — Competitors
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [competitorInput, setCompetitorInput] = useState("");

  const addCompetitor = () => {
    const val = competitorInput.trim();
    if (val && !competitors.includes(val)) {
      setCompetitors([...competitors, val]);
    }
    setCompetitorInput("");
  };

  const removeCompetitor = (name: string) => {
    setCompetitors(competitors.filter((c) => c !== name));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCompetitor();
    }
  };

  const canProceedStep1 = domain.trim() && brandName.trim();

  const handleCreate = async () => {
    setLoading(true);
    try {
      const project = await createProject({
        domain: domain.trim().replace(/^https?:\/\//, "").replace(/\/$/, ""),
        brandName: brandName.trim(),
        industry: industry || null,
        country,
        language: "en",
        plan: "starter",
      });

      // Add competitors via API
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

      toast({ title: "Project created!", description: `${brandName} is ready to monitor.` });
      handleClose();
    } catch (err: any) {
      toast({ title: "Failed to create project", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setDomain("");
    setBrandName("");
    setIndustry("");
    setCountry("US");
    setCompetitors([]);
    setCompetitorInput("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground font-medium">Step {step} of 2</span>
          </div>
          <DialogTitle className="text-xl">
            {step === 1 ? "Set up your brand" : "Add competitors"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {step === 1
              ? "Tell us about the brand you want to monitor in AI search results."
              : "Add the brands you compete with. We'll track their AI visibility alongside yours."}
          </p>
        </DialogHeader>

        {/* Progress bar */}
        <div className="w-full h-1 bg-muted rounded-full mt-1">
          <div
            className="h-1 bg-primary rounded-full transition-all duration-300"
            style={{ width: step === 1 ? "50%" : "100%" }}
          />
        </div>

        {step === 1 && (
          <div className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="domain" className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Domain
              </Label>
              <Input
                id="domain"
                placeholder="e.g. yourcompany.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">No need to include https://</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="brand" className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Brand Name
              </Label>
              <Input
                id="brand"
                placeholder="e.g. Acme Corp"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Industry</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((i) => (
                      <SelectItem key={i} value={i}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Country</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label>Competitor Brands</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. CompetitorName"
                  value={competitorInput}
                  onChange={(e) => setCompetitorInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
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
                    <button
                      onClick={() => removeCompetitor(name)}
                      className="ml-0.5 rounded-full hover:bg-muted p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {competitors.length === 0 && (
              <div className="rounded-md border border-dashed p-4 text-center">
                <p className="text-sm text-muted-foreground">No competitors added yet.</p>
                <p className="text-xs text-muted-foreground mt-0.5">You can skip this and add them later in Settings.</p>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
