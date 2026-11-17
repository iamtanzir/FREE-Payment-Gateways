import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, User, Lock, Monitor, Globe } from "lucide-react";
import { MfaSetup } from "@/components/MfaSetup";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import fpgLogo from "@/assets/fpg-logo.svg";

export default function Profile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
          avatar_url: avatarUrl.trim() || null,
        })
        .eq("user_id", user!.id);
      if (error) throw error;
      await supabase.auth.updateUser({
        data: { full_name: fullName.trim() },
      });
    },
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updatePassword = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) throw new Error("Passwords do not match");
      if (newPassword.length < 6) throw new Error("Password must be at least 6 characters");
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const initials = fullName
    ? fullName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : (user?.email?.[0] || "U").toUpperCase();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        {/* Profile Banner */}
        <div className="relative rounded-xl overflow-hidden animate-fade-in">
          <div className="h-32 gradient-primary" />
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background/80 to-transparent" />
          <div className="absolute bottom-4 left-6 flex items-end gap-4">
            <div className="h-20 w-20 rounded-full border-4 border-background bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary shadow-lg">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-20 w-20 rounded-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="pb-1">
              <h1 className="text-xl font-bold text-primary-foreground drop-shadow-sm">{fullName || "User"}</h1>
              <p className="text-sm text-primary-foreground/80 drop-shadow-sm">{user?.email}</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-6 animate-slide-up">
          <TabsList className="bg-muted/50 backdrop-blur-sm">
            <TabsTrigger value="profile" className="gap-2 transition-all duration-200 data-[state=active]:shadow-sm">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2 transition-all duration-200 data-[state=active]:shadow-sm">
              <Lock className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="sessions" className="gap-2 transition-all duration-200 data-[state=active]:shadow-sm">
              <Monitor className="h-4 w-4" />
              Sessions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="shadow-card hover-lift animate-fade-in">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your profile details</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateProfile.mutate();
                  }}
                  className="space-y-6"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" className="focus-glow transition-all duration-200" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={user?.email || ""} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+880..." className="focus-glow transition-all duration-200" />
                    </div>
                    <div className="space-y-2">
                      <Label>Avatar URL</Label>
                      <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." className="focus-glow transition-all duration-200" />
                    </div>
                  </div>
                  <Button type="submit" className="gradient-primary hover:opacity-90 transition-all duration-200" disabled={updateProfile.isPending}>
                    {updateProfile.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="shadow-card hover-lift animate-fade-in">
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your password to keep your account secure</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    updatePassword.mutate();
                  }}
                  className="space-y-4 max-w-md"
                >
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" required className="focus-glow transition-all duration-200" />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm New Password</Label>
                    <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" required className="focus-glow transition-all duration-200" />
                  </div>
                  <Button type="submit" className="gradient-primary hover:opacity-90 transition-all duration-200" disabled={updatePassword.isPending}>
                    {updatePassword.isPending ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <MfaSetup />
          </TabsContent>

          <TabsContent value="sessions">
            <Card className="shadow-card hover-lift animate-fade-in">
              <CardHeader>
                <CardTitle>Browser Sessions</CardTitle>
                <CardDescription>Manage and log out your active sessions on other browsers and devices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5 transition-all duration-200">
                    <Globe className="h-8 w-8 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Current Session</p>
                      <p className="text-xs text-muted-foreground">
                        {navigator.userAgent.includes("Chrome") ? "Chrome" : navigator.userAgent.includes("Firefox") ? "Firefox" : "Browser"} — {new Date().toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-xs text-success font-medium bg-success/10 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      await supabase.auth.signOut({ scope: "others" });
                      toast.success("All other sessions have been logged out");
                    }}
                  >
                    Log Out Other Sessions
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
