import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Building2, Users, Zap, BarChart3, ShieldAlert } from "lucide-react";

const PLAN_COLORS: Record<string, string> = {
  free: "secondary",
  starter: "outline",
  growth: "default",
  agency: "default",
  enterprise: "default",
};

export default function AdminPage() {
  const { user } = useAuth();

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn: () => fetch("/api/admin/stats").then((r) => r.json()),
  });

  const { data: orgs = [], isLoading: loadingOrgs } = useQuery({
    queryKey: ["/api/admin/orgs"],
    queryFn: () => fetch("/api/admin/orgs").then((r) => r.json()),
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: () => fetch("/api/admin/users").then((r) => r.json()),
  });

  if (!user) return null;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-6 h-6 text-red-500" />
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <Badge variant="destructive" className="ml-2">Super Admin</Badge>
      </div>

      {/* Stats overview */}
      {loadingStats ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Building2 className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats?.totalOrgs || 0}</p>
                <p className="text-xs text-muted-foreground">Organizations</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
                <p className="text-xs text-muted-foreground">Users</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.totalProjects || 0}</p>
                <p className="text-xs text-muted-foreground">Projects</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Zap className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.totalScans || 0}</p>
                <p className="text-xs text-muted-foreground">Total Scans</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Plan distribution */}
      {stats?.planDistribution && (
        <Card>
          <CardHeader><CardTitle>Plan Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              {Object.entries(stats.planDistribution).map(([plan, count]: any) => (
                <div key={plan} className="flex items-center gap-2">
                  <Badge variant={PLAN_COLORS[plan] as any} className="capitalize">{plan}</Badge>
                  <span className="font-bold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Organizations table */}
      <Card>
        <CardHeader><CardTitle>Organizations ({orgs.length})</CardTitle></CardHeader>
        <CardContent>
          {loadingOrgs ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scans/mo</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.map((org: any) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{org.name}</p>
                        <p className="text-xs text-muted-foreground">{org.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={PLAN_COLORS[org.plan] as any} className="capitalize">{org.plan}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={org.subscriptionStatus === "active" ? "default" : "secondary"}>
                        {org.subscriptionStatus || "free"}
                      </Badge>
                    </TableCell>
                    <TableCell>{org.scansThisMonth || 0} / {org.maxScansPerMonth === 999 ? "∞" : org.maxScansPerMonth}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(org.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Users table */}
      <Card>
        <CardHeader><CardTitle>Users ({users.length})</CardTitle></CardHeader>
        <CardContent>
          {loadingUsers ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
