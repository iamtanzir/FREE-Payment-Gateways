import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import fpgLogo from "@/assets/fpg-logo.svg";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSent(true);
    toast.success("Password reset link sent!");
  };

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
            <CardTitle className="text-lg">
              {sent ? "Check your email" : "Reset your password"}
            </CardTitle>
            <CardDescription>
              {sent
                ? "We've sent a password reset link to your email"
                : "Enter your email and we'll send you a reset link"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4 animate-fade-in">
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  A password reset link has been sent to <span className="font-medium text-foreground">{email}</span>. Please check your inbox and spam folder.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => { setSent(false); setEmail(""); }}
                >
                  Send again
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2 animate-fade-in stagger-1">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="focus-glow transition-all duration-200"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full gradient-primary hover:opacity-90 transition-all duration-200 animate-fade-in stagger-2"
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground animate-fade-in stagger-3">
          <Link to="/login" className="text-primary hover:underline font-medium inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" />
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
