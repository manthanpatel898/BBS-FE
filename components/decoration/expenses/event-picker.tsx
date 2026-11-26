"use client";
import { useEffect, useState } from "react";
import { fetchExpenseEvents } from "@/lib/decoration/expenses/api";
import { EventOption } from "@/lib/decoration/expenses/domain";
import { expenseInputClass, financialDate } from "./shared";
export function ExpenseEventPicker({
  token,
  value,
  onChange,
  optional = false,
  inline = false,
  selectedLabel,
}: {
  token: string;
  value: string;
  onChange: (id: string) => void;
  optional?: boolean;
  inline?: boolean;
  selectedLabel?: string;
}) {
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [items, setItems] = useState<EventOption[]>([]),
    [pages, setPages] = useState(0),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const result = await fetchExpenseEvents(token, search, page);
        if (!cancelled) {
          setItems(result.items);
          setPages(result.totalPages);
        }
      } catch (reason) {
        if (!cancelled)
          setError(
            reason instanceof Error ? reason.message : "Unable to load events.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [token, search, page]);
  return (
    <div className={`finance-picker ${inline ? "finance-picker-inline" : ""}`}>
      <div className="finance-picker-fields">
        <label>
          Find event
          <input
            type="search"
            placeholder="Search customer or booking number"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className={expenseInputClass}
          />
        </label>
        <label>
          {inline ? "Selected event" : "Event"}
          <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className={expenseInputClass}
          >
            <option value="">
              {optional ? "All events" : "Select an event"}
            </option>
            {value && !items.some((item) => item.id === value) && (
              <option value={value}>{selectedLabel ?? "Selected event"}</option>
            )}
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {inline
                  ? `${item.functionName} · ${item.customer.name} · ${financialDate(String(item.startDate))}`
                  : `${item.bookingNumber} · ${item.customer.name} · ${item.functionName} · ${financialDate(String(item.startDate))}`}
              </option>
            ))}
          </select>
        </label>
      </div>
      {loading && (
        <p role="status" className="finance-picker-message">
          Loading events…
        </p>
      )}
      {error && (
        <p role="alert" className="finance-picker-message text-red-700">
          {error}
        </p>
      )}
      {pages > 1 && (
        <div className="finance-picker-pagination">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage(page - 1)}
            className="min-h-9 disabled:opacity-40"
          >
            Previous events
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button
            type="button"
            disabled={page >= pages || loading}
            onClick={() => setPage(page + 1)}
            className="min-h-9 disabled:opacity-40"
          >
            Next events
          </button>
        </div>
      )}
    </div>
  );
}
