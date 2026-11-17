import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useCallback } from "react";

export interface PaginationState {
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
  setPage: (page: number) => void;
  setPerPage: (perPage: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  hasNext: boolean;
  hasPrev: boolean;
  startEntry: number;
  endEntry: number;
}

interface UsePaginatedQueryOptions<T> {
  queryKey: any[];
  tableName: string;
  select?: string;
  filters?: Array<{
    column: string;
    operator: "eq" | "neq" | "ilike" | "gte" | "lte" | "gt" | "lt" | "in" | "is";
    value: any;
  }>;
  orFilter?: string;
  orderBy?: { column: string; ascending?: boolean };
  perPage?: number;
  enabled?: boolean;
}

export function usePaginatedQuery<T = any>({
  queryKey,
  tableName,
  select = "*",
  filters = [],
  orFilter,
  orderBy = { column: "created_at", ascending: false },
  perPage: defaultPerPage = 10,
  enabled = true,
}: UsePaginatedQueryOptions<T>) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPageState] = useState(defaultPerPage);

  const setPerPage = useCallback((newPerPage: number) => {
    setPerPageState(newPerPage);
    setPage(1);
  }, []);

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [...queryKey, page, perPage, filters, orFilter],
    queryFn: async () => {
      let query = supabase
        .from(tableName as any)
        .select(select, { count: "exact" });

      for (const f of filters) {
        if (f.value === null || f.value === undefined) continue;
        if (f.operator === "ilike") {
          query = query.ilike(f.column, f.value);
        } else if (f.operator === "in") {
          query = query.in(f.column, f.value);
        } else if (f.operator === "is") {
          query = query.is(f.column, f.value);
        } else {
          query = query.filter(f.column, f.operator, f.value);
        }
      }

      if (orFilter) {
        query = query.or(orFilter);
      }

      query = query
        .order(orderBy.column, { ascending: orderBy.ascending ?? false })
        .range(from, to);

      const { data: rows, count, error } = await query;
      if (error) throw error;
      return { rows: (rows || []) as T[], totalCount: count || 0 };
    },
    enabled,
    placeholderData: (prev) => prev,
  });

  const totalCount = data?.totalCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

  const pagination: PaginationState = {
    page,
    perPage,
    totalCount,
    totalPages,
    setPage: (p: number) => setPage(Math.max(1, Math.min(p, totalPages))),
    setPerPage,
    nextPage: () => setPage((p) => Math.min(p + 1, totalPages)),
    prevPage: () => setPage((p) => Math.max(p - 1, 1)),
    hasNext: page < totalPages,
    hasPrev: page > 1,
    startEntry: totalCount === 0 ? 0 : from + 1,
    endEntry: Math.min(from + perPage, totalCount),
  };

  return {
    data: (data?.rows || []) as T[],
    isLoading,
    isFetching,
    pagination,
    refetch,
  };
}
