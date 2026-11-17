import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import fpgLogo from "@/assets/fpg-logo.svg";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield } from "lucide-react";

export default function MfaVerify() {
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (otp.length !== 6) return;
    setLoading(true);

    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.[0];

      if (!totpFactor) {
        toast.error("No authenticator found");
        setLoading(false);
        return;
      }

      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });

      if (challengeError) {
        toast.error(challengeError.message);
        setLoading(false);
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.id,
        code: otp,
      });

      if (verifyError) {
        toast.error("Invalid OTP code. Please try again.");
        setOtp("");
        setLoading(false);
        return;
      }

      toast.success("Verified successfully!");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-primary/5 blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-float" style={{ animationDelay: "3s" }} />

      <div className="w-full max-w-sm space-y-6 relative z-10">
        <div className="flex flex-col items-center gap-2 animate-fade-in">
          <div className="relative">
            <img src={fpgLogo} alt="FREE Payment Gateways" className="h-14 w-14 rounded-xl animate-glow-pulse" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">FREE Payment Gateways</h1>
        </div>

        <Card className="shadow-card hover-lift animate-slide-up border-primary/10">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
            <CardDescription>Enter the 6-digit code from your authenticator app</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={setOtp}
              onComplete={handleVerify}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>

            <Button
              onClick={handleVerify}
              className="w-full gradient-primary hover:opacity-90 transition-all duration-200"
              disabled={loading || otp.length !== 6}
            >
              {loading ? "Verifying..." : "Verify"}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/login");
              }}
            >
              Sign in with a different account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
