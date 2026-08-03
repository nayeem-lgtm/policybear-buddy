import { useMemo, useState } from "react";

/** Tiny helper for the dropdown-driven filter pattern used on every list page. */
export function useFilters<T>(
  rows: T[],
  config: {
    searchFields?: (row: T) => string[];
    filters?: Record<string, (row: T) => string>;
  },
) {
  const [search, setSearch] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (q && config.searchFields) {
        const haystack = config.searchFields(row).join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      for (const [key, getter] of Object.entries(config.filters ?? {})) {
        const selected = values[key];
        if (selected && selected !== "all" && getter(row) !== selected) return false;
      }
      return true;
    });
  }, [rows, search, values, config]);

  return {
    search,
    setSearch,
    values,
    setValue: (key: string, value: string) =>
      setValues((v) => ({ ...v, [key]: value })),
    reset: () => {
      setValues({});
      setSearch("");
    },
    filtered,
  };
}

export function unique<T>(rows: T[], getter: (row: T) => string) {
  return Array.from(new Set(rows.map(getter))).filter(Boolean).sort();
}

export function currency(n: number, digits = 0) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
