import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import fpgLogo from "@/assets/fpg-logo.svg";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: email.split("@")[0] },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    if (data.session) {
      toast.success("অ্যাকাউন্ট তৈরি হয়েছে! Organization সেটআপ করুন।");
      navigate("/org-setup");
    } else {
      toast.success("ইমেইলে confirmation লিংক পাঠানো হয়েছে — চেক করুন!");
      navigate("/login");
    }

    setLoading(false);
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
            <CardTitle className="text-lg">Create an account</CardTitle>
            <CardDescription>শুধু email আর password-এই যথেষ্ট</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2 animate-fade-in stagger-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} className="focus-glow transition-all duration-200" />
              </div>
              <div className="space-y-2 animate-fade-in stagger-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="অন্তত ৮ অক্ষর" required value={password} onChange={(e) => setPassword(e.target.value)} className="focus-glow transition-all duration-200" />
              </div>
              <Button type="submit" className="w-full gradient-primary hover:opacity-90 transition-all duration-200 animate-fade-in stagger-3" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground animate-fade-in stagger-4">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
