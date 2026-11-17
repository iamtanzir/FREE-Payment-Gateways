import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Shield, ShieldCheck, ShieldOff, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MfaSetup() {
  const [factors, setFactors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [disableCode, setDisableCode] = useState("");

  const loadFactors = async () => {
    setLoading(true);
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(data?.totp?.filter(f => f.status === "verified") || []);
    setLoading(false);
  };

  useEffect(() => {
    loadFactors();
  }, []);

  const handleEnroll = async () => {
    setEnrolling(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Authenticator App",
    });

    if (error) {
      toast.error(error.message);
      setEnrolling(false);
      return;
    }

    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setFactorId(data.id);
  };

  const handleVerifyEnrollment = async () => {
    if (verifyCode.length !== 6) return;
    setVerifying(true);

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (challengeError) {
      toast.error(challengeError.message);
      setVerifying(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: verifyCode,
    });

    if (verifyError) {
      toast.error("Invalid code. Please try again.");
      setVerifyCode("");
      setVerifying(false);
      return;
    }

    toast.success("Two-factor authentication enabled!");
    setEnrolling(false);
    setQrCode("");
    setSecret("");
    setFactorId("");
    setVerifyCode("");
    setVerifying(false);
    loadFactors();
  };

  const handleUnenroll = async () => {
    if (!factors[0]) return;
    setUnenrolling(true);

    // Verify the code first
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: factors[0].id,
    });

    if (challengeError) {
      toast.error(challengeError.message);
      setUnenrolling(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: factors[0].id,
      challengeId: challenge.id,
      code: disableCode,
    });

    if (verifyError) {
      toast.error("Invalid code. Please verify with your authenticator app.");
      setDisableCode("");
      setUnenrolling(false);
      return;
    }

    const { error } = await supabase.auth.mfa.unenroll({ factorId: factors[0].id });

    if (error) {
      toast.error(error.message);
      setUnenrolling(false);
      return;
    }

    toast.success("Two-factor authentication disabled.");
    setShowDisableDialog(false);
    setDisableCode("");
    setUnenrolling(false);
    loadFactors();
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <Card className="shadow-card hover-lift animate-fade-in stagger-2">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isEnabled = factors.length > 0;

  return (
    <Card className="shadow-card hover-lift animate-fade-in stagger-2">
      <CardHeader>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <CardDescription>Add an extra layer of security to your account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!enrolling ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isEnabled ? "bg-green-500/10" : "bg-primary/10"}`}>
                {isEnabled ? (
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                ) : (
                  <Shield className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <p className="font-medium">Authenticator App</p>
                <p className="text-sm text-muted-foreground">
                  {isEnabled ? "Enabled — your account is protected" : "Not configured"}
                </p>
              </div>
            </div>
            {isEnabled ? (
              <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <ShieldOff className="h-4 w-4 mr-2" />
                    Disable
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
                    <DialogDescription>
                      Enter the 6-digit code from your authenticator app to confirm.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-center py-4">
                    <InputOTP maxLength={6} value={disableCode} onChange={setDisableCode}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowDisableDialog(false)}>Cancel</Button>
                    <Button
                      variant="destructive"
                      onClick={handleUnenroll}
                      disabled={unenrolling || disableCode.length !== 6}
                    >
                      {unenrolling ? "Disabling..." : "Disable 2FA"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : (
              <Button onClick={handleEnroll} className="gradient-primary hover:opacity-90 transition-all duration-200">
                <Shield className="h-4 w-4 mr-2" />
                Enable
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {qrCode ? (
              <>
                <div className="text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                  </p>
                  <div className="flex justify-center">
                    <div className="p-4 bg-white rounded-xl shadow-sm inline-block">
                      <img src={qrCode} alt="QR Code" className="h-48 w-48" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Or enter this secret key manually:
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={secret}
                      className="font-mono text-xs bg-muted"
                    />
                    <Button variant="outline" size="icon" onClick={copySecret}>
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Enter the 6-digit code from your authenticator app:</Label>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={verifyCode}
                      onChange={setVerifyCode}
                      onComplete={handleVerifyEnrollment}
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
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setEnrolling(false);
                      setQrCode("");
                      setSecret("");
                      setFactorId("");
                      setVerifyCode("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 gradient-primary hover:opacity-90 transition-all duration-200"
                    onClick={handleVerifyEnrollment}
                    disabled={verifying || verifyCode.length !== 6}
                  >
                    {verifying ? "Verifying..." : "Verify & Enable"}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
