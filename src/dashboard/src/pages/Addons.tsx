import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Puzzle, Filter, Plus, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

export default function Addons() {
  const [showFilter, setShowFilter] = useState(false);
  const [search, setSearch] = useState("");

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">Addons</p>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Addons</h1>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Addon</span>
          </Button>
        </div>
      </div>

      {/* Table Card */}
      <Card>
        {/* Filter Toggle */}
        <div className="border-b border-border">
          {showFilter && (
            <div className="p-4">
              <div className="flex justify-between mb-3">
                <h3 className="font-semibold text-foreground">Filters</h3>
                <button className="text-sm text-destructive cursor-pointer" onClick={() => setShowFilter(false)}>Reset</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Status</label>
                  <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">All</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Created From</label>
                  <Input type="date" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Created Until</label>
                  <Input type="date" />
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end items-center h-[53px] px-5">
            <Filter
              className="h-5 w-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
              onClick={() => setShowFilter(!showFilter)}
            />
          </div>
        </div>

        {/* Search & Entries */}
        <div className="p-4 border-b border-border">
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Show
              <Input className="w-16 h-8" defaultValue="8" />
              entries
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Search:
              <Input className="w-40 h-8" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Empty state */}
        <CardContent className="py-16">
          <div className="flex flex-col items-center justify-center text-center">
            <Puzzle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">No addons found</h3>
            <p className="text-sm text-muted-foreground">Install addons to extend your system functionality.</p>
          </div>
        </CardContent>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-between items-center">
          <p className="text-sm text-muted-foreground">Showing 0 to 0 of 0 entries</p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" disabled><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </Card>
    </DashboardLayout>
  );
}
