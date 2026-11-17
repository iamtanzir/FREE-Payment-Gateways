import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import fpgLogo from "@/assets/fpg-logo.svg";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Lock } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if user arrived via recovery link
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get("type");

    if (type === "recovery") {
      setValidSession(true);
      setChecking(false);
      return;
    }

    // Also check if there's an active session (user might already be authenticated via the link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setValidSession(true);
      }
      setChecking(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSuccess(true);
    toast.success("Password updated successfully!");
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-primary/5 blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-float" style={{ animationDelay: "3s" }} />

      <div className="w-full max-w-sm space-y-6 relative z-10">
        <div className="flex flex-col items-center gap-2 animate-fade-in">
          <img src={fpgLogo} alt="FREE Payment Gateways" className="h-14 w-14 rounded-xl animate-glow-pulse" />
          <h1 className="text-xl font-semibold tracking-tight">FREE Payment Gateways</h1>
        </div>

        <Card className="shadow-card hover-lift animate-slide-up border-primary/10">
          <CardHeader className="text-center">
            {success ? (
              <>
                <div className="flex justify-center mb-2">
                  <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  </div>
                </div>
                <CardTitle className="text-lg">Password Updated</CardTitle>
                <CardDescription>Your password has been successfully reset</CardDescription>
              </>
            ) : (
              <>
                <div className="flex justify-center mb-2">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Lock className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-lg">Set new password</CardTitle>
                <CardDescription>Enter your new password below</CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-4 animate-fade-in">
                <p className="text-sm text-center text-muted-foreground">
                  You can now sign in with your new password.
                </p>
                <Button
                  className="w-full gradient-primary hover:opacity-90 transition-all duration-200"
                  onClick={() => navigate("/login")}
                >
                  Go to Sign In
                </Button>
              </div>
            ) : !validSession ? (
              <div className="space-y-4 animate-fade-in">
                <p className="text-sm text-center text-muted-foreground">
                  This reset link is invalid or has expired. Please request a new password reset.
                </p>
                <Button
                  className="w-full gradient-primary hover:opacity-90 transition-all duration-200"
                  onClick={() => navigate("/forgot-password")}
                >
                  Request New Link
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2 animate-fade-in stagger-1">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="focus-glow transition-all duration-200"
                  />
                </div>
                <div className="space-y-2 animate-fade-in stagger-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="focus-glow transition-all duration-200"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full gradient-primary hover:opacity-90 transition-all duration-200 animate-fade-in stagger-3"
                  disabled={loading}
                >
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
