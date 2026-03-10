import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCitations } from "@/hooks/use-project-data";
import { ExternalLink, TrendingUp, TrendingDown } from "lucide-react";

export default function Citations() {
  const { data: citations, isLoading } = useCitations();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const owned = (citations || []).filter((c) => c.isOwned);
  const external = (citations || []).filter((c) => !c.isOwned);

  const totalOwned = owned.reduce((a, b) => a + (b.citationCount || 0), 0);
  const totalExternal = external.reduce((a, b) => a + (b.citationCount || 0), 0);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Citations & Source Tracker</h1>
        <p className="text-sm text-muted-foreground mt-1">Track which URLs AI models cite when discussing your industry</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Owned Citations</p>
          <p className="text-2xl font-bold font-mono mt-1">{totalOwned}</p>
          <p className="text-xs text-muted-foreground">{owned.length} pages cited</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">External Sources</p>
          <p className="text-2xl font-bold font-mono mt-1">{totalExternal}</p>
          <p className="text-xs text-muted-foreground">{external.length} domains tracked</p>
        </Card>
      </div>

      <Tabs defaultValue="owned">
        <TabsList>
          <TabsTrigger value="owned" data-testid="button-tab-owned">Owned Citations</TabsTrigger>
          <TabsTrigger value="external" data-testid="button-tab-external">Source Tracker</TabsTrigger>
        </TabsList>

        <TabsContent value="owned" className="mt-4">
          <Card className="p-5">
            <p className="text-xs text-muted-foreground mb-4">
              Pages from your domain that AI models cite in their responses
            </p>
            <div className="space-y-3">
              {owned.map((c, i) => (
                <div key={c.id} className="flex items-center gap-4 p-3 rounded-md bg-card" data-testid={`row-owned-citation-${i}`}>
                  <span className="w-6 text-xs text-muted-foreground font-mono text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.pageTitle}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.url}</p>
                  </div>
                  <span className="font-mono text-sm font-bold">{c.citationCount}</span>
                  <div className={`flex items-center gap-1 text-xs font-medium w-16 justify-end ${(c.weekChange || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {(c.weekChange || 0) >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span>{(c.weekChange || 0) >= 0 ? "+" : ""}{(c.weekChange || 0).toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="external" className="mt-4 space-y-4">
          <Card className="p-4 bg-primary/5 border-primary/20">
            <p className="text-xs font-medium text-primary">Trust Graph</p>
            <p className="text-xs text-muted-foreground mt-1">
              These are the external sources that AI models trust and cite when answering questions about your industry. Prioritize PR outreach and content placement on high-citation sources.
            </p>
          </Card>
          <Card className="p-5">
            <div className="space-y-3">
              {external.map((c, i) => (
                <div key={c.id} className="flex items-center gap-4 p-3 rounded-md bg-card" data-testid={`row-external-citation-${i}`}>
                  <span className="w-6 text-xs text-muted-foreground font-mono text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{c.pageTitle}</p>
                      <a href={c.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-[10px]">{c.domain}</Badge>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-bold">{c.citationCount}</span>
                  <div className={`flex items-center gap-1 text-xs font-medium w-16 justify-end ${(c.weekChange || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {(c.weekChange || 0) >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span>{(c.weekChange || 0) >= 0 ? "+" : ""}{(c.weekChange || 0).toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
