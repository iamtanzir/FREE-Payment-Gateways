import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, ReactNode } from "react";

interface StatusTab {
  value: string;
  label: string;
}

interface PageHeaderProps {
  pretitle: string;
  title: string;
  actions?: ReactNode;
}

export function PageHeader({ pretitle, title, actions }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{pretitle}</p>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

interface StatusPillTabsProps {
  tabs: StatusTab[];
  active: string;
  onChange: (value: string) => void;
}

export function StatusPillTabs({ tabs, active, onChange }: StatusPillTabsProps) {
  return (
    <div className="flex justify-center mb-4">
      <Card className="p-2">
        <div className="flex gap-2 flex-wrap justify-center">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => onChange(tab.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                active === tab.value
                  ? "bg-primary text-primary-foreground shadow-sm scale-105"
                  : "text-muted-foreground hover:bg-muted hover:scale-[1.02]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

interface FilterPanelProps {
  children: ReactNode;
}

export function FilterPanel({ children }: FilterPanelProps) {
  const [showFilter, setShowFilter] = useState(false);

  return (
    <div className="border-b border-border">
      {showFilter && (
        <div className="p-4">
          {children}
        </div>
      )}
      <div className="flex justify-end items-center h-[53px] px-5">
        <Filter
          className="h-5 w-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
          onClick={() => setShowFilter(!showFilter)}
        />
      </div>
    </div>
  );
}

interface EntriesSearchBarProps {
  perPage: number;
  onPerPageChange: (v: number) => void;
  search: string;
  onSearchChange: (v: string) => void;
  bulkAction?: ReactNode;
}

export function EntriesSearchBar({ perPage, onPerPageChange, search, onSearchChange, bulkAction }: EntriesSearchBarProps) {
  return (
    <div className="p-4 border-b border-border">
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Show
          <Input
            className="w-16 h-8"
            type="number"
            value={perPage}
            onChange={(e) => onPerPageChange(Number(e.target.value) || 8)}
          />
          entries
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Search:</span>
          <Input
            className="w-40 h-8"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {bulkAction}
        </div>
      </div>
    </div>
  );
}

interface TablePaginationFooterProps {
  currentPage: number;
  totalPages: number;
  totalEntries: number;
  startEntry: number;
  endEntry: number;
  onPageChange: (page: number) => void;
}

export function TablePaginationFooter({ currentPage, totalPages, totalEntries, startEntry, endEntry, onPageChange }: TablePaginationFooterProps) {
  return (
    <div className="p-4 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-2">
      <p className="text-sm text-muted-foreground">
        Showing {startEntry} to {endEntry} of {totalEntries} entries
      </p>
      <div className="flex gap-1">
        <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          const page = i + 1;
          return (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page)}
            >
              {page}
            </Button>
          );
        })}
        <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
