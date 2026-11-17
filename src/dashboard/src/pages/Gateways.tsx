import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { getGatewayBrand, GATEWAY_TEMPLATE_CONFIGS, type GatewayTemplateConfig } from "@/lib/gateway-brands";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Loader2, Plus, Pencil, Trash2, Filter, ChevronDown, ChevronLeft, ChevronRight,
  RotateCcw, Eye, Settings2, Search
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useBrand } from "@/contexts/BrandContext";
import { useAuth } from "@/contexts/AuthContext";
import { logActivity } from "@/lib/activity-logger";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ConfirmDialog } from "@/components/ConfirmDialog";

// Use GATEWAY_TEMPLATE_CONFIGS from gateway-brands.ts

const TAB_ITEMS = [
  { value: "all", label: "All" },
  { value: "mfs", label: "MFS Gateways" },
  { value: "bank", label: "Bank Gateways" },
  { value: "global", label: "Global Gateways" },
];

export default function Gateways() {
  const { currentOrg } = useOrg();
  const { activeBrandId } = useBrand();
  const orgId = currentOrg?.id;
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [showLimit, setShowLimit] = useState("8");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCreatedFrom, setFilterCreatedFrom] = useState("");
  const [filterCreatedUntil, setFilterCreatedUntil] = useState("");

  // Creation modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<GatewayTemplateConfig | null>(null);
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string; description: string; confirmLabel: string; variant?: "destructive" | "success" | "default"; onConfirm: () => void;
  }>({ title: "", description: "", confirmLabel: "", variant: "destructive", onConfirm: () => {} });

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTemplateDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredTemplates = useMemo(() => {
    if (!templateSearch.trim()) return GATEWAY_TEMPLATE_CONFIGS;
    const s = templateSearch.toLowerCase();
    return GATEWAY_TEMPLATE_CONFIGS.filter(t => t.title.toLowerCase().includes(s));
  }, [templateSearch]);

  const { data: gateways = [], isLoading } = useQuery({
    queryKey: ["gateways", orgId, activeBrandId],
    queryFn: async () => {
      let query = supabase
        .from("gateways")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (activeBrandId) {
        query = query.eq("brand_id", activeBrandId);
      }
      const { data } = await query;
      return data || [];
    },
    enabled: !!orgId,
  });

  const filtered = useMemo(() => {
    return gateways.filter((gw: any) => {
      if (activeTab === "mfs" && gw.gateway_group !== "mfs") return false;
      if (activeTab === "bank" && gw.gateway_group !== "bank") return false;
      if (activeTab === "global" && gw.gateway_group !== "global") return false;
      if (filterStatus === "active" && !gw.is_active) return false;
      if (filterStatus === "inactive" && gw.is_active) return false;
      if (filterCreatedFrom && new Date(gw.created_at) < new Date(filterCreatedFrom)) return false;
      if (filterCreatedUntil && new Date(gw.created_at) > new Date(filterCreatedUntil + "T23:59:59")) return false;
      if (search) {
        const s = search.toLowerCase();
        return gw.display_name.toLowerCase().includes(s) || gw.gateway_type.toLowerCase().includes(s);
      }
      return true;
    });
  }, [gateways, activeTab, search, filterStatus, filterCreatedFrom, filterCreatedUntil]);

  const limit = Math.max(1, Number(showLimit) || 8);
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * limit, safePage * limit);
  const startEntry = filtered.length === 0 ? 0 : (safePage - 1) * limit + 1;
  const endEntry = Math.min(safePage * limit, filtered.length);

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("gateways").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["gateways", orgId] });
      if (orgId && user?.id) {
        logActivity({ action: "update", entityType: "gateway", entityId: variables.id, orgId, userId: user.id, brandId: activeBrandId, details: { is_active: variables.is_active } });
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gateways").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, deletedId) => {
      toast.success("Gateway deleted!");
      queryClient.invalidateQueries({ queryKey: ["gateways", orgId] });
      if (orgId && user?.id) {
        logActivity({ action: "delete", entityType: "gateway", entityId: deletedId, orgId, userId: user.id, brandId: activeBrandId });
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) throw new Error("Please select a gateway");
      const payload: any = {
        display_name: selectedTemplate.title,
        gateway_type: selectedTemplate.gateway_type_hint as any,
        gateway_group: selectedTemplate.tab,
        gateway_mode: selectedTemplate.gateway_mode,
        currency: selectedTemplate.currency,
        organization_id: orgId!,
        brand_id: activeBrandId || null,
        is_active: false,
        config: selectedTemplate.colors,
      };
      const { data, error } = await supabase.from("gateways").insert(payload).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Gateway created!");
      queryClient.invalidateQueries({ queryKey: ["gateways", orgId] });
      if (orgId && user?.id) {
        logActivity({ action: "create", entityType: "gateway", entityId: data.id, orgId, userId: user.id, brandId: activeBrandId, details: { name: selectedTemplate?.title } });
      }
      setCreateOpen(false);
      setSelectedTemplate(null);
      setTemplateSearch("");
      navigate(`/gateways/${data.id}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openNewGateway = useCallback(() => {
    setSelectedTemplate(null);
    setTemplateSearch("");
    setTemplateDropdownOpen(false);
    setCreateOpen(true);
  }, []);

  const toggleSelectAll = () => {
    setSelectedRows(prev =>
      prev.length === paginated.length ? [] : paginated.map((gw: any) => gw.id)
    );
  };

  const toggleRow = (id: string) => {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  const resetFilters = () => {
    setFilterStatus("");
    setFilterCreatedFrom("");
    setFilterCreatedUntil("");
    setCurrentPage(1);
  };

  const formatGatewayName = (type: string) =>
    type?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) || "—";

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-0.5">Gateways</p>
            <h1 className="text-2xl font-bold tracking-tight">Gateways</h1>
          </div>
          <Button onClick={openNewGateway} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Gateway</span>
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex justify-center">
          <Card className="p-1.5 shadow-sm">
            <div className="flex items-center gap-1">
              {TAB_ITEMS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => { setActiveTab(tab.value); setCurrentPage(1); setSelectedRows([]); }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Main Table Card */}
        <Card className="shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {showFilters && (
              <div className="p-4 bg-muted/30 border-b border-border animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Filter className="h-4 w-4" /> Filters
                  </h3>
                  <button onClick={resetFilters} className="text-xs text-destructive hover:underline flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" /> Reset
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Status</Label>
                    <Select value={filterStatus || "all_statuses"} onValueChange={(v) => { setFilterStatus(v === "all_statuses" ? "" : v); setCurrentPage(1); }}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_statuses">All</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Created From</Label>
                    <Input type="date" className="h-9" value={filterCreatedFrom} onChange={(e) => { setFilterCreatedFrom(e.target.value); setCurrentPage(1); }} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Created Until</Label>
                    <Input type="date" className="h-9" value={filterCreatedUntil} onChange={(e) => { setFilterCreatedUntil(e.target.value); setCurrentPage(1); }} />
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Button
                  variant={showFilters ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Filter</span>
                </Button>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  Show
                  <Input
                    className="w-14 h-8 text-center text-xs"
                    value={showLimit}
                    onChange={(e) => { setShowLimit(e.target.value); setCurrentPage(1); }}
                  />
                  entries
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedRows.length > 0 && (
                  <Button variant="destructive" size="sm" className="gap-1.5 text-xs" onClick={() => {
                    setConfirmConfig({
                      title: `Delete ${selectedRows.length} gateway(s)?`,
                      description: "This action cannot be undone. Selected gateways will be permanently removed.",
                      confirmLabel: "Delete",
                      onConfirm: () => {
                        selectedRows.forEach(id => deleteMutation.mutate(id));
                        setSelectedRows([]);
                        setConfirmOpen(false);
                      },
                    });
                    setConfirmOpen(true);
                  }}>
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete ({selectedRows.length})
                  </Button>
                )}
                <div className="relative">
                  <Input
                    className="w-[200px] h-8 pl-8 text-xs"
                    placeholder="Search gateways..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  />
                  <svg className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
                <p className="text-sm text-muted-foreground">Loading gateways...</p>
              </div>
            ) : paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Settings2 className="h-10 w-10 text-muted-foreground/40" />
                <p className="font-semibold text-muted-foreground">No gateways found</p>
                <p className="text-xs text-muted-foreground">Try adjusting your filters or add a new gateway.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left p-3 w-10">
                        <Checkbox
                          checked={selectedRows.length === paginated.length && paginated.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Name</th>
                      <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Currency</th>
                      <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                      <th className="text-right p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginated.map((gw: any) => (
                      <tr key={gw.id} className="hover:bg-muted/30 transition-colors group">
                        <td className="p-3">
                          <Checkbox
                            checked={selectedRows.includes(gw.id)}
                            onCheckedChange={() => toggleRow(gw.id)}
                          />
                        </td>
                        <td className="p-3 cursor-pointer" onClick={() => navigate(`/gateways/${gw.id}`)}>
                          <div className="flex items-center gap-3">
                            {(() => {
                              const brand = getGatewayBrand(gw.gateway_type, gw.display_name);
                              const logoUrl = gw.image_url || (gw.gateway_type);
                              return logoUrl ? (
                                <img src={logoUrl} alt={gw.display_name} className="h-9 w-9 rounded-lg object-cover flex-shrink-0" loading="lazy" />
                              ) : (
                                <div
                                  className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold"
                                  style={{ backgroundColor: brand.bgColor, color: brand.textColor }}
                                >
                                  {brand.icon}
                                </div>
                              );
                            })()}
                            <div>
                              <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                                {gw.display_name}
                              </p>
                              <p className="text-xs text-muted-foreground">{formatGatewayName(gw.gateway_type)} · {gw.gateway_mode || "live"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="font-mono text-xs">{gw.currency || "BDT"}</Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className={`inline-block w-2 h-2 rounded-full ${gw.is_active ? "bg-emerald-500" : "bg-red-400"}`} />
                            <span className={`text-xs font-medium ${gw.is_active ? "text-emerald-600" : "text-red-500"}`}>
                              {gw.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                                Actions <ChevronDown className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => navigate(`/gateways/${gw.id}`)} className="gap-2 text-xs">
                                <Eye className="h-3.5 w-3.5" /> View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/gateways/${gw.id}`)} className="gap-2 text-xs">
                                <Pencil className="h-3.5 w-3.5" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  const newActive = !gw.is_active;
                                  setConfirmConfig({
                                    title: newActive ? "Activate this gateway?" : "Deactivate this gateway?",
                                    description: `"${gw.display_name}" will be ${newActive ? "activated" : "deactivated"}.`,
                                    confirmLabel: newActive ? "Activate" : "Deactivate",
                                    variant: newActive ? "success" : "destructive",
                                    onConfirm: () => {
                                      toggleMutation.mutate({ id: gw.id, is_active: newActive });
                                      setConfirmOpen(false);
                                    },
                                  });
                                  setConfirmOpen(true);
                                }}
                                className="gap-2 text-xs"
                              >
                                <Switch className="h-3 w-6 pointer-events-none" checked={gw.is_active} />
                                {gw.is_active ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setConfirmConfig({
                                    title: "Delete this gateway?",
                                    description: `"${gw.display_name}" will be permanently deleted. This action cannot be undone.`,
                                    confirmLabel: "Delete",
                                    onConfirm: () => {
                                      deleteMutation.mutate(gw.id);
                                      setConfirmOpen(false);
                                    },
                                  });
                                  setConfirmOpen(true);
                                }}
                                className="gap-2 text-xs text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{startEntry}</span> to <span className="font-semibold text-foreground">{endEntry}</span> of <span className="font-semibold text-foreground">{filtered.length}</span> entries
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={safePage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <Button
                      key={i}
                      variant={safePage === i + 1 ? "default" : "outline"}
                      size="sm"
                      className="h-7 w-7 p-0 text-xs"
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </Button>
                  ))}
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={safePage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Gateway Modal — matches reference (pay.bkdns.shop) */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Gateway</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-sm">
                Gateway <span className="text-destructive">*</span>
              </Label>
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setTemplateDropdownOpen(!templateDropdownOpen)}
                  className="flex items-center justify-between w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <span className={selectedTemplate ? "text-foreground" : "text-muted-foreground"}>
                    {selectedTemplate ? selectedTemplate.title : "Select gateway"}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${templateDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {templateDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 rounded-md border border-border bg-popover shadow-lg max-h-[280px] flex flex-col">
                    <div className="p-2 border-b border-border">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          className="h-8 pl-8 text-xs"
                          placeholder="Search..."
                          value={templateSearch}
                          onChange={(e) => setTemplateSearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto flex-1">
                      {filteredTemplates.length === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground">No gateways found</div>
                      ) : (
                        filteredTemplates.map((tpl) => (
                          <button
                            key={tpl.slug}
                            type="button"
                            onClick={() => {
                              setSelectedTemplate(tpl);
                              setTemplateDropdownOpen(false);
                              setTemplateSearch("");
                            }}
                            className={`w-full text-left px-3 py-2.5 text-sm hover:bg-accent/50 transition-colors ${
                              selectedTemplate?.title === tpl.title ? "bg-accent text-accent-foreground font-medium" : "text-foreground"
                            }`}
                          >
                            {tpl.title}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !selectedTemplate}
              >
                {createMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...</>
                ) : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmConfig.title}
        description={confirmConfig.description}
        confirmLabel={confirmConfig.confirmLabel}
        variant={confirmConfig.variant}
        onConfirm={confirmConfig.onConfirm}
      />
    </DashboardLayout>
  );
}