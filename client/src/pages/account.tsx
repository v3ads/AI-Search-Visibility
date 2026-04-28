import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, User, Lock, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AccountPage() {
  const { user, org, refreshAuth } = useAuth();
  const { toast } = useToast();

  const [profileForm, setProfileForm] = useState({ name: user?.name || "", email: user?.email || "" });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [orgForm, setOrgForm] = useState({ name: org?.name || "" });
  const [orgLoading, setOrgLoading] = useState(false);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileLoading(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      await refreshAuth();
      toast({ title: "Profile updated" });
    } catch (err: any) {
      setProfileError(err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    if (passwordForm.newPass !== passwordForm.confirm) { setPasswordError("Passwords do not match"); return; }
    if (passwordForm.newPass.length < 8) { setPasswordError("Password must be at least 8 characters"); return; }
    setPasswordLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: passwordForm.current, newPassword: passwordForm.newPass }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      setPasswordForm({ current: "", newPass: "", confirm: "" });
      toast({ title: "Password updated" });
    } catch (err: any) {
      setPasswordError(err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleOrgSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrgLoading(true);
    try {
      const res = await fetch("/api/org", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgForm.name }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      await refreshAuth();
      toast({ title: "Organization updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setOrgLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your personal account and organization</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-muted-foreground" />
            <CardTitle>Profile</CardTitle>
          </div>
          <CardDescription>Update your name and email address</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSave} className="space-y-4">
            {profileError && <Alert variant="destructive"><AlertDescription>{profileError}</AlertDescription></Alert>}
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={profileForm.name} onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" value={profileForm.email} onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))} placeholder="jane@company.com" />
            </div>
            <Button type="submit" disabled={profileLoading}>
              {profileLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-muted-foreground" />
            <CardTitle>Password</CardTitle>
          </div>
          <CardDescription>Change your account password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSave} className="space-y-4">
            {passwordError && <Alert variant="destructive"><AlertDescription>{passwordError}</AlertDescription></Alert>}
            <div className="space-y-2">
              <Label htmlFor="current">Current password</Label>
              <Input id="current" type="password" value={passwordForm.current} onChange={(e) => setPasswordForm((f) => ({ ...f, current: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPass">New password</Label>
              <Input id="newPass" type="password" value={passwordForm.newPass} onChange={(e) => setPasswordForm((f) => ({ ...f, newPass: e.target.value }))} required minLength={8} placeholder="Min. 8 characters" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input id="confirm" type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))} required />
            </div>
            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating...</> : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Organization */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-muted-foreground" />
            <CardTitle>Organization</CardTitle>
          </div>
          <CardDescription>Update your organization's name</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleOrgSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization name</Label>
              <Input id="orgName" value={orgForm.name} onChange={(e) => setOrgForm({ name: e.target.value })} placeholder="Acme Inc." />
            </div>
            <div className="space-y-2">
              <Label>Organization slug</Label>
              <Input value={org?.slug || ""} disabled className="text-muted-foreground" />
              <p className="text-xs text-muted-foreground">The slug cannot be changed after creation.</p>
            </div>
            <Button type="submit" disabled={orgLoading}>
              {orgLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
