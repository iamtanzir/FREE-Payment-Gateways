import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import {
  Plus, Search, Key, Users, CheckCircle, XCircle, AlertTriangle, Clock,
  DollarSign, Loader2, Copy, Eye, Trash2, RefreshCw, Ban, CalendarPlus
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

function generateLicenseKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${segment()}-${segment()}-${segment()}-${segment()}`;
}

interface LicenseRow {
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
  price_amount: number;
  price_currency: string;
  notes: string | null;
  created_at: string;
}

export default function LicenseAdmin() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const [licenses, setLicenses] = useState<LicenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailLicense, setDetailLicense] = useState<LicenseRow | null>(null);
  const [creating, setCreating] = useState(false);

  // Create form
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formType, setFormType] = useState<string>("regular");
  const [formMaxDomains, setFormMaxDomains] = useState("1");
  const [formExpiryDays, setFormExpiryDays] = useState("365");
  const [formPrice, setFormPrice] = useState("49");
  const [formNotes, setFormNotes] = useState("");

  const fetchLicenses = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("licenses")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setLicenses((data || []).map(d => ({
        ...d,
        authorized_domains: d.authorized_domains || [],
        api_domains: d.api_domains || [],
      })));
    } catch (err) {
      console.error("Failed to fetch licenses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLicenses(); }, [currentOrg]);

  const filteredLicenses = licenses.filter(l => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (typeFilter !== "all" && l.license_type !== typeFilter) return false;
    if (paymentFilter !== "all" && l.payment_status !== paymentFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return l.license_key.toLowerCase().includes(q) ||
        l.customer_name.toLowerCase().includes(q) ||
        l.customer_email.toLowerCase().includes(q);
    }
    return true;
  });

  const stats = {
    total: licenses.length,
    active: licenses.filter(l => l.status === "active").length,
    expired: licenses.filter(l => l.status === "expired").length,
    revenue: licenses.filter(l => l.payment_status === "paid").reduce((s, l) => s + Number(l.price_amount), 0),
    expiringSoon: licenses.filter(l => {
      if (!l.expires_at || l.status !== "active") return false;
      const d = new Date(l.expires_at).getTime() - Date.now();
      return d > 0 && d < 7 * 24 * 60 * 60 * 1000;
    }).length,
  };

  const handleCreate = async () => {
    if (!currentOrg || !formName || !formEmail) return;
    setCreating(true);
    try {
      const key = generateLicenseKey();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(formExpiryDays));

      const { error } = await supabase.from("licenses").insert({
        license_key: key,
        customer_name: formName,
        customer_email: formEmail,
        license_type: formType as any,
        max_domains: parseInt(formMaxDomains),
        expires_at: expiresAt.toISOString(),
        price_amount: parseFloat(formPrice),
        organization_id: currentOrg.id,
        status: "inactive" as any,
        payment_status: "manual" as any,
        notes: formNotes || null,
      });
      if (error) throw error;
      toast({ title: "লাইসেন্স তৈরি হয়েছে", description: `Key: ${key}` });
      setCreateOpen(false);
      resetForm();
      fetchLicenses();
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormName(""); setFormEmail(""); setFormType("regular");
    setFormMaxDomains("1"); setFormExpiryDays("365"); setFormPrice("49"); setFormNotes("");
  };

  const handleStatusToggle = async (lic: LicenseRow) => {
    const newStatus = lic.status === "active" ? "inactive" : "active";
    try {
      const { error } = await supabase
        .from("licenses")
        .update({ status: newStatus as any })
        .eq("id", lic.id);
      if (error) throw error;
      toast({ title: `লাইসেন্স ${newStatus === "active" ? "সক্রিয়" : "নিষ্ক্রিয়"} করা হয়েছে` });
      fetchLicenses();
      if (detailLicense?.id === lic.id) setDetailLicense({ ...lic, status: newStatus });
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
    }
  };

  const handleRevoke = async (lic: LicenseRow) => {
    try {
      const { error } = await supabase
        .from("licenses")
        .update({ status: "revoked" as any })
        .eq("id", lic.id);
      if (error) throw error;
      toast({ title: "লাইসেন্স বাতিল করা হয়েছে", variant: "destructive" });
      fetchLicenses();
      setDetailLicense(null);
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: "কপি হয়েছে" });
  };

  const statusBadge = (status: string) => {
    const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default", inactive: "outline", expired: "secondary", revoked: "destructive",
    };
    return <Badge variant={map[status] || "outline"} className="capitalize">{status}</Badge>;
  };

  const paymentBadge = (status: string) => {
    const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
      paid: { variant: "default", className: "bg-green-600 hover:bg-green-700" },
      pending: { variant: "secondary", className: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400" },
      manual: { variant: "outline", className: "border-blue-300 text-blue-600" },
      free: { variant: "outline", className: "border-emerald-300 text-emerald-600" },
    };
    const style = map[status] || { variant: "outline" as const, className: "" };
    return <Badge variant={style.variant} className={`capitalize ${style.className}`}>{status}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">License Management</h1>
            <p className="text-muted-foreground text-sm">সব লাইসেন্স ম্যানেজ করুন</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Create License</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>নতুন লাইসেন্স তৈরি</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label>Customer Email</Label>
                  <Input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="john@example.com" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>License Type</Label>
                    <Select value={formType} onValueChange={setFormType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regular">Regular</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Max Domains</Label>
                    <Select value={formMaxDomains} onValueChange={setFormMaxDomains}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="999">Unlimited</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Expiry (days)</Label>
                    <Input type="number" value={formExpiryDays} onChange={e => setFormExpiryDays(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Price (USD)</Label>
                    <Input type="number" value={formPrice} onChange={e => setFormPrice(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={creating || !formName || !formEmail}>
                  {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Key className="h-4 w-4 mr-2" />}
                  Generate License
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Key className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.expired}</p>
                <p className="text-xs text-muted-foreground">Expired</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">${stats.revenue}</p>
                <p className="text-xs text-muted-foreground">Revenue</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.expiringSoon}</p>
                <p className="text-xs text-muted-foreground">Expiring Soon</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by key, name, email..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Payment" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payment</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="shadow-card">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLicenses.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Key className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>কোনো লাইসেন্স পাওয়া যায়নি</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>License Key</TableHead>
                    <TableHead>Customer</TableHead>
                     <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLicenses.map((lic) => (
                    <TableRow key={lic.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                            {lic.license_key.substring(0, 9)}...
                          </code>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyKey(lic.license_key)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{lic.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{lic.customer_email}</p>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{lic.license_type}</Badge></TableCell>
                      <TableCell>{statusBadge(lic.status)}</TableCell>
                      <TableCell>{paymentBadge(lic.payment_status)}</TableCell>
                      <TableCell>
                        {lic.expires_at ? (
                          <span className="text-xs">{format(new Date(lic.expires_at), "PP")}</span>
                        ) : (
                          <span className="text-xs text-green-600">Lifetime</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailLicense(lic)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStatusToggle(lic)}>
                            {lic.status === "active" ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={!!detailLicense} onOpenChange={(o) => !o && setDetailLicense(null)}>
          <DialogContent className="max-w-lg">
            {detailLicense && (
              <>
                <DialogHeader>
                  <DialogTitle>License Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Key</p>
                      <code className="text-xs font-mono">{detailLicense.license_key}</code>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      {statusBadge(detailLicense.status)}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Customer</p>
                      <p>{detailLicense.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p>{detailLicense.customer_email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Type</p>
                      <p className="capitalize">{detailLicense.license_type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Price</p>
                      <p>${detailLicense.price_amount} {detailLicense.price_currency}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Expires</p>
                      <p>{detailLicense.expires_at ? format(new Date(detailLicense.expires_at), "PPP") : "Lifetime"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Last Synced</p>
                      <p>{detailLicense.last_synced_at ? formatDistanceToNow(new Date(detailLicense.last_synced_at), { addSuffix: true }) : "Never"}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Authorized Domains ({detailLicense.authorized_domains.length}/{detailLicense.max_domains})</p>
                    {detailLicense.authorized_domains.length > 0 ? (
                      detailLicense.authorized_domains.map(d => (
                        <Badge key={d} variant="secondary" className="mr-1 mb-1 font-mono text-xs">{d}</Badge>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">None</p>
                    )}
                  </div>

                  {detailLicense.notes && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm">{detailLicense.notes}</p>
                    </div>
                  )}
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleStatusToggle(detailLicense)}>
                    {detailLicense.status === "active" ? "Deactivate" : "Activate"}
                  </Button>
                  {detailLicense.status !== "revoked" && (
                    <Button variant="destructive" size="sm" onClick={() => handleRevoke(detailLicense)}>
                      <Ban className="h-4 w-4 mr-1" /> Revoke
                    </Button>
                  )}
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
