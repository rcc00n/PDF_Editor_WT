import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SectionHeader from "@/shared/ui/SectionHeader";
import { Card, CardBody } from "@/shared/ui/Card";
import Badge from "@/shared/ui/Badge";
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import Select from "@/shared/ui/Select";
import { useAppStore } from "@/shared/state/useAppStore";
import { dateTimeShort } from "@/shared/lib/format";
import {
  extractRig,
  filterTickets,
  groupTicketsByForm,
} from "@/shared/lib/ticketFilters";
import { Filter } from "lucide-react";
import type { TicketStatus } from "@/entities/types";

type FilterKey = "all" | "synced" | "needs_attention";

function ticketStatusTone(
  status: TicketStatus
): "success" | "danger" | "warning" | "neutral" {
  switch (status) {
    case "synced":
      return "success";
    case "error":
      return "danger";
    case "queued":
      return "warning";
    default:
      return "neutral";
  }
}

const FILTER_OPTIONS: { key: FilterKey; label: string; icon?: boolean }[] = [
  { key: "all", label: "All", icon: true },
  { key: "synced", label: "Synced" },
  { key: "needs_attention", label: "Needs attention" },
];

export default function ReviewPage() {
  const nav = useNavigate();
  const tickets = useAppStore((s) => s.tickets);
  const forms = useAppStore((s) => s.forms);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rigQuery, setRigQuery] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [formFilter, setFormFilter] = useState("all");

  const formOptions = useMemo(
    () => forms.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [forms]
  );

  const statusFiltered = useMemo(() => {
    return tickets.filter((t) => {
      if (filter === "all") return true;
      if (filter === "synced") return t.status === "synced";
      if (filter === "needs_attention")
        return (
          t.status === "error" ||
          t.status === "queued" ||
          t.status === "pending"
        );
      return true;
    });
  }, [tickets, filter]);

  const filtered = useMemo(
    () =>
      filterTickets(statusFiltered, {
        from: fromDate,
        to: toDate,
        rig: rigQuery,
        query,
        status: statusFilter,
        formId: formFilter === "all" ? undefined : formFilter,
      }),
    [statusFiltered, fromDate, toDate, rigQuery, query, statusFilter, formFilter]
  );

  const grouped = useMemo(
    () => groupTicketsByForm(filtered, forms),
    [filtered, forms]
  );

  const hasFilters =
    filter !== "all" ||
    fromDate ||
    toDate ||
    rigQuery ||
    query ||
    statusFilter !== "all" ||
    formFilter !== "all";

  const clearFilters = () => {
    setFilter("all");
    setFromDate("");
    setToDate("");
    setRigQuery("");
    setQuery("");
    setStatusFilter("all");
    setFormFilter("all");
  };

  return (
    <div className="pb-10">
      <SectionHeader
        title="Admin Review & Export"
        subtitle="Completed preview with metadata, attachments, and export actions."
        right={
          <>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:flex-nowrap">
              {FILTER_OPTIONS.map((opt) => (
                <Button
                  key={opt.key}
                  size="sm"
                  variant={filter === opt.key ? "primary" : "secondary"}
                  onClick={() => setFilter(opt.key)}>
                  {opt.icon && <Filter size={16} />} {opt.label}
                </Button>
              ))}
            </div>
            <Button
              size="sm"
              variant="ghost"
              disabled={!hasFilters}
              onClick={clearFilters}>
              Clear filters
            </Button>
          </>
        }
      />

      <div className="px-4 mt-4 sm:px-6 sm:mt-6">
        <Card>
          <CardBody>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6 pt-2 pl-1">
              <div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                  From
                </div>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                  To
                </div>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
              <div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                  Status
                </div>
                <Select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as TicketStatus | "all")
                  }>
                  <option value="all">All statuses</option>
                  <option value="synced">Synced</option>
                  <option value="queued">Queued</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In progress</option>
                  <option value="error">Error</option>
                </Select>
              </div>
              <div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                  Form
                </div>
                <Select
                  value={formFilter}
                  onChange={(e) => setFormFilter(e.target.value)}>
                  <option value="all">All forms</option>
                  {formOptions.map((form) => (
                    <option key={form.id} value={form.id}>
                      {form.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                  Rig
                </div>
                <Input
                  placeholder="Search rig"
                  value={rigQuery}
                  onChange={(e) => setRigQuery(e.target.value)}
                />
              </div>
              <div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                  Ticket, assignee, or values
                </div>
                <Input
                  placeholder="Search tickets"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 space-y-6">
              {grouped.map((group) => (
                <div key={group.id}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">{group.name}</div>
                    <Badge tone={group.tickets.length ? "success" : "warning"}>
                      {group.tickets.length}
                    </Badge>
                  </div>
                  <div className="mt-2 overflow-auto rf-scrollbar">
                    <table className="w-full text-sm sm:table-fixed">
                      <thead className="text-xs text-neutral-500 dark:text-neutral-400">
                        <tr className="text-left">
                          <th className="py-2 sm:w-[38%]">Ticket</th>
                          <th className="py-2 hidden sm:table-cell sm:w-[10%]">Rig</th>
                          <th className="py-2 hidden sm:table-cell sm:w-[18%]">
                            Assigned
                          </th>
                          <th className="py-2 hidden sm:table-cell sm:w-[12%]">Status</th>
                          <th className="py-2 text-right sm:w-[10%]">Open</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.tickets.map((t) => (
                          <tr
                            key={t.id}
                            className="border-t border-neutral-200 dark:border-neutral-800 cursor-pointer transition-colors hover:bg-neutral-50/70 focus-within:bg-neutral-50/70 dark:hover:bg-neutral-900/70 dark:focus-within:bg-neutral-900/70"
                            role="button"
                            tabIndex={0}
                            onClick={() => nav(`/review/${t.id}`)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                nav(`/review/${t.id}`);
                              }
                            }}>
                            <td className="py-3">
                              <div className="font-medium">
                                {t.id} · {t.title}
                              </div>
                              <div className="text-xs text-neutral-500 dark:text-neutral-400 hidden sm:block">
                                {dateTimeShort(t.assignedAt)}
                              </div>
                              <div className="text-xs text-neutral-500 dark:text-neutral-400 sm:hidden">
                                {t.assignedTo} · {dateTimeShort(t.assignedAt)}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2 sm:hidden">
                                <Badge tone={ticketStatusTone(t.status)}>
                                  {t.status}
                                </Badge>
                              </div>
                            </td>
                            <td className="py-3 hidden sm:table-cell">
                              {extractRig(t) || "—"}
                            </td>
                            <td className="py-3 hidden sm:table-cell">
                              {t.assignedTo}
                            </td>
                            <td className="py-3 hidden sm:table-cell">
                              <Badge tone={ticketStatusTone(t.status)}>
                                {t.status}
                              </Badge>
                            </td>
                            <td className="py-3 text-right">
                              <Link
                                className="rf-focus rounded-xl px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                                to={`/review/${t.id}`}
                                onClick={(e) => e.stopPropagation()}>
                                Open →
                              </Link>
                            </td>
                          </tr>
                        ))}
                        {group.tickets.length === 0 && (
                          <tr>
                            <td
                              className="py-10 text-center text-sm text-neutral-500 dark:text-neutral-400"
                              colSpan={5}>
                              Nothing here
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {grouped.length === 0 && (
                <div className="py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
                  Nothing here
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
