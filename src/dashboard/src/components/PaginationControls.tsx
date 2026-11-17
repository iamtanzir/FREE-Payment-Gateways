import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PaginationState } from "@/hooks/usePaginatedQuery";
import { useIsMobile } from "@/hooks/use-mobile";

interface PaginationControlsProps {
  pagination: PaginationState;
  showEntries?: boolean;
}

export function PaginationControls({ pagination, showEntries = true }: PaginationControlsProps) {
  const isMobile = useIsMobile();
  const { page, totalPages, totalCount, startEntry, endEntry, hasNext, hasPrev, setPage, prevPage, nextPage } = pagination;

  if (totalPages <= 1) return null;

  // Calculate visible page numbers
  const getVisiblePages = () => {
    const maxVisible = isMobile ? 3 : 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="flex items-center justify-between p-4 border-t border-border">
      {showEntries && (
        <p className="text-sm text-muted-foreground">
          {startEntry}–{endEntry} of {totalCount.toLocaleString()}
        </p>
      )}
      <div className={`flex items-center gap-1 ${!showEntries ? "w-full justify-center" : ""}`}>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={!hasPrev} onClick={prevPage}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {getVisiblePages().map((p) => (
          <Button
            key={p}
            variant={page === p ? "default" : "outline"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage(p)}
          >
            {p}
          </Button>
        ))}
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={!hasNext} onClick={nextPage}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
