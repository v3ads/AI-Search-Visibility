import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PROJECT_ID } from "@/lib/constants";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-gradient-radial from-primary/10 via-cyan-500/5 to-transparent blur-3xl" />
      </div>
      <div className="relative text-center space-y-4">
        <p className="text-7xl font-bold font-mono text-primary">404</p>
        <h1 className="text-xl font-semibold">Beyond the Event Horizon</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          The page you are trying to access has crossed the event horizon. No data can escape from here.
        </p>
        <Link href={`/projects/${PROJECT_ID}`}>
          <Button data-testid="button-go-home">Return to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
