import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import {
  RefreshCw, Trash2, Shield, ShieldCheck, ShieldX, User, Calendar,
  Globe, Key, Package, CheckCircle, XCircle, Clock, AlertTriangle, Loader2,
  Crown, Zap, Check, Star
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface LicenseData {
  id: string;
  license_key: string;
  customer_name: string;
  customer_email: string;
  product: string;
  license_type: string;
  status: string;
  max_domains: number;
  authorized_domains: string[];
  api_domains: string[];
  expires_at: string | null;
  last_synced_at: string | null;
  payment_status: string;
}

function maskKey(key: string) {
  if (key.length <= 8) return key;
  return key.substring(0, 4) + "-" + key.substring(5, 8) + "..." + key.substring(key.length - 4);
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "active": return <ShieldCheck className="h-5 w-5 text-green-500" />;
    case "expired": return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    case "revoked": return <ShieldX className="h-5 w-5 text-destructive" />;
    default: return <Shield className="h-5 w-5 text-muted-foreground" />;
  }
}

function StatusBadgeColor({ status }: { status: string }) {
  switch (status) {
    case "active": return "default" as const;
    case "expired": return "secondary" as const;
    case "revoked": return "destructive" as const;
    default: return "outline" as const;
  }
}

export default function License() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [license, setLicense] = useState<LicenseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [licenseKeyInput, setLicenseKeyInput] = useState("");
  const [activating, setActivating] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"regular" | "premium" | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [licenseSettings, setLicenseSettings] = useState<{
    regular_price: number;
    premium_price: number;
    default_currency: string;
    default_expiry_days: number;
  } | null>(null);

  const currentDomain = window.location.hostname;

  const fetchLicense = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      // First try active, then expired
      let { data, error } = await supabase
        .from("licenses")
        .select("*")
        .eq("activated_by_org_id", currentOrg.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (!data) {
        const expiredResult = await supabase
          .from("licenses")
          .select("*")
          .eq("activated_by_org_id", currentOrg.id)
          .eq("status", "expired")
          .order("expires_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (expiredResult.data) {
          data = expiredResult.data;
          error = expiredResult.error;
        }
      }

      if (error) throw error;
      if (data) {
        setLicense({
          ...data,
          authorized_domains: data.authorized_domains || [],
          api_domains: data.api_domains || [],
        });
      } else {
        setLicense(null);
      }
    } catch (err) {
      console.error("Failed to fetch license:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLicenseSettings = async () => {
    if (!currentOrg) return;
    try {
      const { data } = await supabase
        .from("license_settings")
        .select("regular_price, premium_price, default_currency, default_expiry_days")
        .eq("organization_id", currentOrg.id)
        .maybeSingle();
      if (data) {
        setLicenseSettings(data);
      } else {
        setLicenseSettings({
          regular_price: 49,
          premium_price: 149,
          default_currency: "USD",
          default_expiry_days: 365,
        });
      }
    } catch {
      setLicenseSettings({
        regular_price: 49,
        premium_price: 149,
        default_currency: "USD",
        default_expiry_days: 365,
      });
    }
  };

  useEffect(() => {
    fetchLicense();
    fetchLicenseSettings();
  }, [currentOrg]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await supabase.functions.invoke("sync-license", {
        body: { domain: currentDomain },
      });
      if (res.error) throw res.error;
      toast({ title: "লাইসেন্স রিফ্রেশ হয়েছে", description: "সর্বশেষ তথ্য আপডেট করা হয়েছে।" });
      await fetchLicense();
    } catch (err: any) {
      toast({ title: "রিফ্রেশ ব্যর্থ", description: err.message, variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  };

  const handleClear = async () => {
    if (!license || !currentOrg) return;
    try {
      const { error } = await supabase
        .from("licenses")
        .update({ activated_by_org_id: null, status: "inactive" as any })
        .eq("id", license.id);
      if (error) throw error;
      setLicense(null);
      toast({ title: "লাইসেন্স সাফ হয়েছে", description: "লাইসেন্স ডিঅ্যাক্টিভেট করা হয়েছে।" });
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
    }
  };

  const handleActivate = async () => {
    if (!licenseKeyInput.trim() || !currentOrg) return;
    setActivating(true);
    try {
      const res = await supabase.functions.invoke("activate-license", {
        body: {
          license_key: licenseKeyInput.trim().toUpperCase(),
          domain: currentDomain,
          org_id: currentOrg.id,
        },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: "লাইসেন্স অ্যাক্টিভেট হয়েছে!", description: "আপনার লাইসেন্স সফলভাবে সক্রিয় করা হয়েছে।" });
      setActivateOpen(false);
      setLicenseKeyInput("");
      await fetchLicense();
    } catch (err: any) {
      toast({ title: "অ্যাক্টিভেশন ব্যর্থ", description: err.message, variant: "destructive" });
    } finally {
      setActivating(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPlan || !currentOrg) return;
    setPurchasing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      const res = await supabase.functions.invoke("license-purchase", {
        body: {
          organization_id: currentOrg.id,
          license_type: selectedPlan,
          customer_name: profile?.full_name || user.email || "Customer",
          customer_email: user.email || "",
        },
      });

      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);

      toast({
        title: "পেমেন্ট সেশন তৈরি হয়েছে",
        description: "চেকআউট পেজে রিডাইরেক্ট করা হচ্ছে...",
      });

      setBuyOpen(false);
      setSelectedPlan(null);

      // Navigate to checkout
      navigate(`/checkout/${res.data.ref}`);
    } catch (err: any) {
      toast({
        title: "পেমেন্ট তৈরি ব্যর্থ",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  };
  const handleRenew = async () => {
    if (!license || !currentOrg) return;
    setRenewing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      const renewType = (license.license_type === "premium" ? "premium" : "regular") as "regular" | "premium";

      const res = await supabase.functions.invoke("license-purchase", {
        body: {
          organization_id: currentOrg.id,
          license_type: renewType,
          customer_name: profile?.full_name || user.email || "Customer",
          customer_email: user.email || "",
        },
      });

      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);

      toast({
        title: "রিনিউ পেমেন্ট তৈরি হয়েছে",
        description: "চেকআউট পেজে রিডাইরেক্ট করা হচ্ছে...",
      });

      setRenewOpen(false);
      navigate(`/checkout/${res.data.ref}`);
    } catch (err: any) {
      toast({ title: "রিনিউ ব্যর্থ", description: err.message, variant: "destructive" });
    } finally {
      setRenewing(false);
    }
  };

  const handleUpgrade = async () => {
    if (!license || !currentOrg) return;
    setUpgrading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      const res = await supabase.functions.invoke("license-purchase", {
        body: {
          organization_id: currentOrg.id,
          license_type: "premium",
          customer_name: profile?.full_name || user.email || "Customer",
          customer_email: user.email || "",
        },
      });

      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);

      toast({
        title: "আপগ্রেড পেমেন্ট তৈরি হয়েছে",
        description: "চেকআউট পেজে রিডাইরেক্ট করা হচ্ছে...",
      });

      setUpgradeOpen(false);
      navigate(`/checkout/${res.data.ref}`);
    } catch (err: any) {
      toast({ title: "আপগ্রেড ব্যর্থ", description: err.message, variant: "destructive" });
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">লাইসেন্স</h1>
            <p className="text-muted-foreground text-sm">আপনার লাইসেন্স স্ট্যাটাস ও বিবরণ</p>
          </div>
          {license && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                Refresh License
              </Button>
              <Button variant="destructive" size="sm" onClick={handleClear}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear License
              </Button>
            </div>
          )}
        </div>

        {!license ? (
          /* No License State */
          <Card className="shadow-card">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-6">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                <Key className="h-10 w-10 text-muted-foreground" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">কোনো অ্যাক্টিভ লাইসেন্স নেই</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  FREE Payment Gateways ব্যবহার করতে একটি লাইসেন্স অ্যাক্টিভেট করুন অথবা নতুন কিনুন।
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="default" onClick={() => setBuyOpen(true)}>
                  <Package className="h-4 w-4 mr-2" />
                  Buy License
                </Button>
                <Dialog open={activateOpen} onOpenChange={setActivateOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Key className="h-4 w-4 mr-2" />
                      Activate License
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>লাইসেন্স অ্যাক্টিভেট করুন</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <Input
                        placeholder="XXXX-XXXX-XXXX-XXXX"
                        value={licenseKeyInput}
                        onChange={(e) => setLicenseKeyInput(e.target.value.toUpperCase())}
                        className="font-mono tracking-wider"
                      />
                      <p className="text-xs text-muted-foreground">
                        আপনার লাইসেন্স কী প্রদান করুন। কী টি ইমেইলে পাঠানো হয়েছিল।
                      </p>
                      <Button onClick={handleActivate} disabled={activating || !licenseKeyInput.trim()} className="w-full">
                        {activating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Key className="h-4 w-4 mr-2" />}
                        Activate
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Buy License Modal */}
              <Dialog open={buyOpen} onOpenChange={(open) => { setBuyOpen(open); if (!open) setSelectedPlan(null); }}>
                <DialogContent className="sm:max-w-[680px]">
                  <DialogHeader>
                    <DialogTitle className="text-xl">লাইসেন্স কিনুন</DialogTitle>
                    <p className="text-sm text-muted-foreground">আপনার প্রয়োজন অনুযায়ী একটি প্ল্যান বেছে নিন</p>
                  </DialogHeader>
                  <div className="grid sm:grid-cols-2 gap-4 pt-4">
                    {/* Regular Plan */}
                    <div
                      onClick={() => setSelectedPlan("regular")}
                      className={`relative cursor-pointer rounded-xl border-2 p-6 transition-all hover:shadow-md ${
                        selectedPlan === "regular"
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Zap className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">Regular</h3>
                            <p className="text-xs text-muted-foreground">ছোট ব্যবসার জন্য</p>
                          </div>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold">
                            ${licenseSettings?.regular_price ?? 49}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            /{licenseSettings?.default_expiry_days === 365 ? "year" : `${licenseSettings?.default_expiry_days ?? 365} days`}
                          </span>
                        </div>
                        <Separator />
                        <ul className="space-y-2.5 text-sm">
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary shrink-0" />
                            <span>১টি ডোমেইন অথরাইজেশন</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary shrink-0" />
                            <span>সকল পেমেন্ট গেটওয়ে</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary shrink-0" />
                            <span>ইমেইল সাপোর্ট</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary shrink-0" />
                            <span>স্ট্যান্ডার্ড আপডেট</span>
                          </li>
                        </ul>
                      </div>
                      {selectedPlan === "regular" && (
                        <div className="absolute top-3 right-3">
                          <CheckCircle className="h-5 w-5 text-primary" />
                        </div>
                      )}
                    </div>

                    {/* Premium Plan */}
                    <div
                      onClick={() => setSelectedPlan("premium")}
                      className={`relative cursor-pointer rounded-xl border-2 p-6 transition-all hover:shadow-md ${
                        selectedPlan === "premium"
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3">
                        <Star className="h-3 w-3 mr-1" /> জনপ্রিয়
                      </Badge>
                      <div className="space-y-4 pt-2">
                        <div className="flex items-center gap-2">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Crown className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">Premium</h3>
                            <p className="text-xs text-muted-foreground">বড় ব্যবসার জন্য</p>
                          </div>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold">
                            ${licenseSettings?.premium_price ?? 149}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            /{licenseSettings?.default_expiry_days === 365 ? "year" : `${licenseSettings?.default_expiry_days ?? 365} days`}
                          </span>
                        </div>
                        <Separator />
                        <ul className="space-y-2.5 text-sm">
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary shrink-0" />
                            <span>৫টি ডোমেইন অথরাইজেশন</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary shrink-0" />
                            <span>সকল পেমেন্ট গেটওয়ে</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary shrink-0" />
                            <span>প্রায়োরিটি সাপোর্ট</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary shrink-0" />
                            <span>অগ্রিম আপডেট ও ফিচার</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary shrink-0" />
                            <span>হোয়াইটলেবেল ব্র্যান্ডিং</span>
                          </li>
                        </ul>
                      </div>
                      {selectedPlan === "premium" && (
                        <div className="absolute top-3 right-3">
                          <CheckCircle className="h-5 w-5 text-primary" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 space-y-3">
                    <Button
                      className="w-full"
                      size="lg"
                      disabled={!selectedPlan || purchasing}
                      onClick={handlePurchase}
                    >
                      {purchasing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          পেমেন্ট তৈরি হচ্ছে...
                        </>
                      ) : selectedPlan ? (
                        <>
                          <Package className="h-4 w-4 mr-2" />
                          {selectedPlan === "premium" ? "Premium" : "Regular"} প্ল্যান কিনুন — ${selectedPlan === "premium" ? (licenseSettings?.premium_price ?? 149) : (licenseSettings?.regular_price ?? 49)}
                        </>
                      ) : (
                        "একটি প্ল্যান সিলেক্ট করুন"
                      )}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      পেমেন্ট সম্পন্ন হলে লাইসেন্স কী স্বয়ংক্রিয়ভাবে অ্যাক্টিভেট হবে
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ) : (
          /* License Details (Active or Expired) */
          <>
            {/* Expired License Renewal Banner */}
            {license.status === "expired" && (
              <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800 shadow-card">
                <CardContent className="flex flex-col sm:flex-row items-center gap-4 py-5">
                  <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-6 w-6 text-orange-500" />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-semibold text-orange-800 dark:text-orange-300">লাইসেন্স মেয়াদ উত্তীর্ণ হয়েছে</h3>
                    <p className="text-sm text-orange-600 dark:text-orange-400 mt-0.5">
                      আপনার {license.license_type === "premium" ? "Premium" : "Regular"} লাইসেন্সের মেয়াদ শেষ হয়ে গেছে।
                      {license.expires_at && ` (${format(new Date(license.expires_at), "PPP")})`}
                      {" "}সার্ভিস চালু রাখতে রিনিউ করুন।
                    </p>
                  </div>
                  <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
                    <DialogTrigger asChild>
                      <Button className="shrink-0">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        রিনিউ করুন
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>লাইসেন্স রিনিউ করুন</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-2">
                        <div className="p-4 rounded-lg border bg-muted/50 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">প্ল্যান</span>
                            <Badge variant="secondary" className="capitalize">{license.license_type}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">মূল্য</span>
                            <span className="font-semibold">
                              ${license.license_type === "premium"
                                ? (licenseSettings?.premium_price ?? 149)
                                : (licenseSettings?.regular_price ?? 49)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">মেয়াদ</span>
                            <span className="text-sm">
                              {licenseSettings?.default_expiry_days === 365 ? "১ বছর" : `${licenseSettings?.default_expiry_days ?? 365} দিন`}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          রিনিউ করলে একই প্ল্যানে নতুন লাইসেন্স তৈরি হবে এবং পেমেন্ট সম্পন্ন হলে স্বয়ংক্রিয়ভাবে অ্যাক্টিভেট হবে।
                        </p>
                        <Button onClick={handleRenew} disabled={renewing} className="w-full">
                          {renewing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              পেমেন্ট তৈরি হচ্ছে...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              রিনিউ করুন — ${license.license_type === "premium"
                                ? (licenseSettings?.premium_price ?? 149)
                                : (licenseSettings?.regular_price ?? 49)}
                            </>
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            )}

            {/* Upgrade Banner — Active Regular License */}
            {license.status === "active" && license.license_type === "regular" && (
              <Card className="border-primary/30 bg-primary/5 shadow-card">
                <CardContent className="flex flex-col sm:flex-row items-center gap-4 py-5">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Crown className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-semibold">Premium এ আপগ্রেড করুন</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      ৫টি ডোমেইন, প্রায়োরিটি সাপোর্ট, হোয়াইটলেবেল ব্র্যান্ডিং ও অগ্রিম ফিচার আনলক করুন।
                    </p>
                  </div>
                  <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
                    <DialogTrigger asChild>
                      <Button className="shrink-0">
                        <Crown className="h-4 w-4 mr-2" />
                        আপগ্রেড করুন
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Premium এ আপগ্রেড</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 rounded-lg border bg-muted/30 text-center">
                            <p className="text-xs text-muted-foreground">বর্তমান</p>
                            <p className="font-semibold mt-1">Regular</p>
                            <p className="text-sm text-muted-foreground">${licenseSettings?.regular_price ?? 49}</p>
                          </div>
                          <div className="p-3 rounded-lg border-2 border-primary bg-primary/5 text-center">
                            <p className="text-xs text-primary font-medium">আপগ্রেড</p>
                            <p className="font-semibold mt-1">Premium</p>
                            <p className="text-sm text-primary">${licenseSettings?.premium_price ?? 149}</p>
                          </div>
                        </div>
                        <Separator />
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary shrink-0" />
                            <span>১ → ৫টি ডোমেইন অথরাইজেশন</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary shrink-0" />
                            <span>প্রায়োরিটি সাপোর্ট</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary shrink-0" />
                            <span>হোয়াইটলেবেল ব্র্যান্ডিং</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary shrink-0" />
                            <span>অগ্রিম আপডেট ও ফিচার</span>
                          </li>
                        </ul>
                        <Button onClick={handleUpgrade} disabled={upgrading} className="w-full">
                          {upgrading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              পেমেন্ট তৈরি হচ্ছে...
                            </>
                          ) : (
                            <>
                              <Crown className="h-4 w-4 mr-2" />
                              Premium আপগ্রেড করুন — ${licenseSettings?.premium_price ?? 149}
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                          পেমেন্ট সম্পন্ন হলে নতুন Premium লাইসেন্স স্বয়ংক্রিয়ভাবে অ্যাক্টিভেট হবে
                        </p>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            )}

            {/* Last Synced */}
            {license.last_synced_at && (
              <p className="text-xs text-muted-foreground">
                Last synced: {formatDistanceToNow(new Date(license.last_synced_at), { addSuffix: true })}
              </p>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* License Status */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-base">License Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                    <StatusIcon status={license.status} />
                    <div>
                      <p className="font-semibold capitalize">{license.status}</p>
                      <p className="text-xs text-muted-foreground capitalize">{license.license_type} License</p>
                    </div>
                    <Badge variant={StatusBadgeColor({ status: license.status })} className="ml-auto capitalize">
                      {license.status}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-3 p-3 rounded-lg border">
                    <User className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Licensed To</p>
                      <p className="text-sm font-medium">{license.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{license.customer_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Expires</p>
                      {license.expires_at ? (
                        <>
                          <p className="text-sm font-medium">{format(new Date(license.expires_at), "PPP p")}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(license.expires_at), { addSuffix: true })}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm font-medium text-green-600">Lifetime</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Domain Authorization */}
              <Card className="shadow-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Domain Authorization</CardTitle>
                    <Badge variant="outline">
                      {license.authorized_domains.length}/{license.max_domains} used
                    </Badge>
                  </div>
                  <CardDescription>Authorized Domains</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {license.authorized_domains.length > 0 ? (
                    license.authorized_domains.map((domain) => (
                      <div key={domain} className="flex items-center gap-3 p-3 rounded-lg border">
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                        <span className="text-sm font-mono">{domain}</span>
                        {domain === currentDomain && (
                          <Badge variant="secondary" className="ml-auto text-xs">Current Domain</Badge>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No domains authorized yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* API Access Domains */}
              <Card className="shadow-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">API Access Domains</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {license.api_domains.length}/{license.max_domains} used
                      </Badge>
                      {license.max_domains - license.api_domains.length > 0 && (
                        <Badge variant="secondary" className="text-xs text-green-600">
                          {license.max_domains - license.api_domains.length} remaining
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription>Authorized API Domains</CardDescription>
                </CardHeader>
                <CardContent>
                  {license.api_domains.length > 0 ? (
                    <div className="space-y-2">
                      {license.api_domains.map((domain) => (
                        <div key={domain} className="flex items-center gap-3 p-3 rounded-lg border">
                          <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                          <span className="text-sm font-mono">{domain}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No API domains registered yet</p>
                      <p className="text-xs mt-1">API domains will be added automatically when API requests are made</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* License Information */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-base">License Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider w-28">License Key</span>
                    <span className="text-sm font-mono">{maskKey(license.license_key)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider w-28">License Type</span>
                    <span className="text-sm capitalize">{license.license_type}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-purple-500 shrink-0" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider w-28">Product</span>
                    <span className="text-sm">{license.product}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${license.status === "active" ? "bg-green-500" : "bg-red-500"}`} />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider w-28">State</span>
                    <span className="text-sm capitalize">{license.status}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
