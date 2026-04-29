import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, UserPlus, Trash2, Mail, Crown, Shield, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ROLE_ICONS: Record<string, any> = { owner: Crown, admin: Shield, member: User };
const ROLE_COLORS: Record<string, string> = { owner: "text-yellow-500", admin: "text-blue-500", member: "text-gray-500" };

export default function TeamPage() {
  const { org, user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "member" });
  const [inviteError, setInviteError] = useState("");

  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["/api/org/members"],
    queryFn: () => fetch("/api/org/members").then((r) => r.json()),
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ["/api/org/invitations"],
    queryFn: () => fetch("/api/org/invitations").then((r) => r.json()),
  });

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      fetch("/api/org/invitations", { credentials: "include", method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).message);
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/org/invitations"] });
      setInviteOpen(false);
      setInviteForm({ email: "", role: "member" });
      toast({ title: "Invitation sent", description: `Invite sent to ${inviteForm.email}` });
    },
    onError: (err: any) => setInviteError(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: number) =>
      fetch(`/api/org/members/${userId}`, { credentials: "include", method: "DELETE" }).then((r) => { if (!r.ok) throw new Error("Failed"); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/org/members"] }); toast({ title: "Member removed" }); },
  });

  const roleChangeMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) =>
      fetch(`/api/org/members/${userId}`, { credentials: "include", method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) }).then((r) => { if (!r.ok) throw new Error("Failed"); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/org/members"] }); },
  });

  const revokeInviteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/org/invitations/${id}`, { credentials: "include", method: "DELETE" }).then((r) => { if (!r.ok) throw new Error("Failed"); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/org/invitations"] }); },
  });

  const myRole = members.find((m: any) => m.userId === user?.id)?.role || "member";
  const canManage = myRole === "owner" || myRole === "admin";

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    inviteMutation.mutate(inviteForm);
  };

  const getInitials = (name: string, email: string) => {
    if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    return email[0].toUpperCase();
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-muted-foreground mt-1">Manage members of <strong>{org?.name}</strong></p>
        </div>
        {canManage && (
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button><UserPlus className="w-4 h-4 mr-2" />Invite member</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite a team member</DialogTitle>
                <DialogDescription>They'll receive an email with a link to join {org?.name}.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4 mt-2">
                {inviteError && <Alert variant="destructive"><AlertDescription>{inviteError}</AlertDescription></Alert>}
                <div className="space-y-2">
                  <Label>Email address</Label>
                  <Input type="email" placeholder="colleague@company.com" value={inviteForm.email} onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))} required autoFocus />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteForm.role} onValueChange={(v) => setInviteForm((f) => ({ ...f, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member — can view and run scans</SelectItem>
                      <SelectItem value="admin">Admin — can manage projects and team</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={inviteMutation.isPending}>
                    {inviteMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : "Send invitation"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {loadingMembers ? (
            <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : members.map((m: any) => {
            const RoleIcon = ROLE_ICONS[m.role] || User;
            const isMe = m.userId === user?.id;
            const isOwner = m.role === "owner";
            return (
              <div key={m.userId} className="flex items-center gap-3 py-3">
                <Avatar className="w-9 h-9">
                  <AvatarFallback className="text-xs">{getInitials(m.user?.name || "", m.user?.email || "")}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{m.user?.name || m.user?.email}</p>
                    {isMe && <Badge variant="outline" className="text-xs">You</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{m.user?.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {canManage && !isOwner && !isMe ? (
                    <Select value={m.role} onValueChange={(v) => roleChangeMutation.mutate({ userId: m.userId, role: v })}>
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className={`flex items-center gap-1 text-xs ${ROLE_COLORS[m.role]}`}>
                      <RoleIcon className="w-3.5 h-3.5" />
                      <span className="capitalize">{m.role}</span>
                    </div>
                  )}
                  {canManage && !isOwner && !isMe && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeMutation.mutate(m.userId)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations ({invitations.length})</CardTitle>
            <CardDescription>These people haven't accepted their invitation yet</CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            {invitations.map((inv: any) => (
              <div key={inv.id} className="flex items-center gap-3 py-3">
                <div className="w-9 h-9 bg-muted rounded-full flex items-center justify-center">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Invited as <span className="capitalize">{inv.role}</span> · Expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                {canManage && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => revokeInviteMutation.mutate(inv.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
