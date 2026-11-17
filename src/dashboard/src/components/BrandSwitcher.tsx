import { useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useBrand } from "@/contexts/BrandContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface BrandSwitcherProps {
  collapsed?: boolean;
}

export function BrandSwitcher({ collapsed }: BrandSwitcherProps) {
  const { currentOrg } = useOrg();
  const { brands, activeBrand, switchBrand } = useBrand();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");

  const createBrand = useMutation({
    mutationFn: async (name: string) => {
      if (!currentOrg?.id) throw new Error("No org");
      const { data, error } = await supabase
        .from("brands")
        .insert({ name, organization_id: currentOrg.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["brands", currentOrg?.id] });
      switchBrand(data.id);
      setDialogOpen(false);
      setNewBrandName("");
      toast.success("Brand created");
    },
    onError: () => toast.error("Failed to create brand"),
  });

  const initial = activeBrand?.name?.charAt(0)?.toUpperCase() || "B";

  return (
    <>
      <div className="px-3 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 rounded-lg border border-sidebar-border bg-sidebar p-2 text-left hover:bg-sidebar-accent transition-colors">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold text-primary-foreground"
                style={{ backgroundColor: activeBrand?.primary_color || "hsl(var(--primary))" }}
              >
                {initial}
              </div>
              {!collapsed && (
                <div className="flex flex-1 flex-col overflow-hidden">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Active brand
                  </span>
                  <span className="truncate text-sm font-medium text-foreground">
                    {activeBrand?.name || "No brand"}
                  </span>
                </div>
              )}
              {!collapsed && <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={() => setDialogOpen(true)} className="gap-2 text-primary">
              <Plus className="h-4 w-4" />
              Add new brand
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {brands.map((brand) => (
              <DropdownMenuItem
                key={brand.id}
                onClick={() => switchBrand(brand.id)}
                className="gap-2"
              >
                <div
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold text-primary-foreground"
                  style={{ backgroundColor: brand.primary_color || "hsl(var(--primary))" }}
                >
                  {brand.name.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 truncate">{brand.name}</span>
                {activeBrand?.id === brand.id && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Brand</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="brand-name">Brand Name</Label>
              <Input
                id="brand-name"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                placeholder="e.g. My Store"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newBrandName.trim()) createBrand.mutate(newBrandName.trim());
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => newBrandName.trim() && createBrand.mutate(newBrandName.trim())}
              disabled={!newBrandName.trim() || createBrand.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
