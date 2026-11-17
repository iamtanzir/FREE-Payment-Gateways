import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import fpgLogo from "@/assets/fpg-logo.svg";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    // Check if user has MFA enrolled
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const verifiedFactors = factors?.totp?.filter(f => f.status === "verified") || [];

    if (verifiedFactors.length > 0) {
      // User has MFA — redirect to verification
      navigate("/mfa-verify");
    } else {
      toast.success("Welcome back!");
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      {/* Decorative floating shapes */}
      <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-primary/5 blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-float" style={{ animationDelay: "3s" }} />
      <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-primary/3 blur-2xl animate-float" style={{ animationDelay: "1.5s" }} />

      <div className="w-full max-w-sm space-y-6 relative z-10">
        <div className="flex flex-col items-center gap-2 animate-fade-in">
          <div className="relative">
            <img src={fpgLogo} alt="FREE Payment Gateways" className="h-14 w-14 rounded-xl animate-glow-pulse" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">FREE Payment Gateways</h1>
        </div>

        <Card className="shadow-card hover-lift animate-slide-up border-primary/10">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">Welcome back</CardTitle>
            <CardDescription>Sign in to your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2 animate-fade-in stagger-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} className="focus-glow transition-all duration-200" />
              </div>
              <div className="space-y-2 animate-fade-in stagger-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
                </div>
                <Input id="password" type="password" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} className="focus-glow transition-all duration-200" />
              </div>
              <Button type="submit" className="w-full gradient-primary hover:opacity-90 transition-all duration-200 animate-fade-in stagger-3" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground animate-fade-in stagger-4">
          Don't have an account?{" "}
          <Link to="/register" className="text-primary hover:underline font-medium">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
