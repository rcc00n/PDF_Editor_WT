import { DEMO_MODE } from '@/shared/api/config'
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SectionHeader from "@/shared/ui/SectionHeader";
import Button from "@/shared/ui/Button";
import {
  Card,
  CardBody,
  CardHeader,
  CardSub,
  CardTitle,
} from "@/shared/ui/Card";
import Badge from "@/shared/ui/Badge";
import Input from "@/shared/ui/Input";
import Select from "@/shared/ui/Select";
import { useAppStore } from "@/shared/state/useAppStore";
import { dateTimeShort, timeHHMM } from "@/shared/lib/format";
import {
  extractRig,
  filterTickets,
  groupTicketsByForm,
} from "@/shared/lib/ticketFilters";
import { RefreshCw, RotateCcw, ShieldAlert } from "lucide-react";
import type { TicketStatus } from "@/entities/types";

export default function QueuePage() {
  const queue = useAppStore((s) => s.queue);
  const tickets = useAppStore((s) => s.tickets);
  const forms = useAppStore((s) => s.forms);
  const lastSuccess = useAppStore((s) => s.lastSyncSuccess);
  const retryFailed = useAppStore((s) => s.retryFailed);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rigQuery, setRigQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");

  const stats = useMemo(
    () => ({
      pending: queue.filter((q) => q.status === "pending").length,
      inProgress: queue.filter((q) => q.status === "in_progress").length,
      failed: queue.filter((q) => q.status === "failed").length,
    }),
    [queue]
  );

  const filtered = useMemo(
    () =>
      filterTickets(tickets, {
        from: fromDate,
        to: toDate,
        rig: rigQuery,
        status: statusFilter,
      }),
    [tickets, fromDate, toDate, rigQuery, statusFilter]
  );

  const grouped = useMemo(
    () => groupTicketsByForm(filtered, forms),
    [filtered, forms]
  );

  return (
    <div className="pb-10">
      <SectionHeader
        title="Sync Queue"
        subtitle="Queued mutations with explicit retry and status visibility."
        right={
          <>
            <Button variant="secondary" onClick={() => retryFailed()}>
              <RotateCcw size={16} /> Retry Failed
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                useAppStore.getState().pushToast({
                  title: "Auto-sync",
                  message: "Enabled (demo)",
                  variant: "success",
                })
              }>
              <RefreshCw size={16} /> Review Latest Sync
            </Button>
          </>
        }
      />

      <div className="px-4 mt-4 sm:px-6 sm:mt-6 grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4 items-start">
        <Card>
          <CardHeader>
            <CardTitle>Daily Field Tickets</CardTitle>
            <CardSub>Grouped by form</CardSub>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                  Status
                </div>
                <Select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as TicketStatus | "all")
                  }>
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In progress</option>
                  <option value="queued">Queued</option>
                  <option value="synced">Synced</option>
                  <option value="error">Error</option>
                </Select>
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
                  <div className="mt-2 flex flex-col gap-2">
                    {group.tickets.map((t) => (
                      <Link
                        key={t.id}
                        to={`/review/${t.id}`}
                        className="rf-focus rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {t.id} · {t.title}
                            </div>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                              {t.assignedTo} · {dateTimeShort(t.assignedAt)}
                            </div>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                              Rig: {extractRig(t) || "—"}
                            </div>
                          </div>
                          <Badge
                            tone={
                              t.status === "synced"
                                ? "success"
                                : t.status === "error"
                                ? "danger"
                                : t.status === "queued"
                                ? "warning"
                                : "neutral"
                            }>
                            {t.status}
                          </Badge>
                        </div>
                        {t.lastError && (
                          <div className="mt-2 text-xs text-red-600 dark:text-red-300 flex items-center gap-2">
                            <ShieldAlert size={14} /> {t.lastError}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
              {grouped.length === 0 && (
                <div className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                  Nothing here
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        <div className="flex flex-col gap-4 ">
          <Card>
            <CardBody>
              <div className="text-sm font-semibold pt-2">Queue Overview</div>
              <div className="mt-2 flex flex-wrap gap-2 items-center">
                <Badge tone={stats.pending ? "warning" : "neutral"}>
                  {stats.pending} Pending
                </Badge>
                <Badge tone="neutral">{stats.inProgress} In progress</Badge>
                <Badge tone={stats.failed ? "danger" : "neutral"}>
                  {stats.failed} Failed
                </Badge>
              </div>
              <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                Last success: {lastSuccess ? timeHHMM(lastSuccess) : "—"}
              </div>
              <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                {DEMO_MODE ? "Local simulation: no server receives these records." : "Queued submissions sync to the configured API."}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Queued mutations</CardTitle>
              <CardSub>Inspect each queue item</CardSub>
            </CardHeader>
            <CardBody>
              <div className="flex flex-col gap-2">
                {queue.length === 0 && (
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">
                    Queue is empty
                  </div>
                )}
                {queue.map((q) => (
                  <div
                    key={q.id}
                    className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {q.type}
                        </div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                          {q.ticketId} · {dateTimeShort(q.createdAt)} · attempts{" "}
                          {q.attempts}
                        </div>
                      </div>
                      <Badge
                        tone={
                          q.status === "synced"
                            ? "success"
                            : q.status === "failed"
                            ? "danger"
                            : q.status === "pending"
                            ? "warning"
                            : "neutral"
                        }>
                        {q.status}
                      </Badge>
                    </div>
                    {q.lastError && (
                      <div className="mt-2 text-xs text-red-600 dark:text-red-300">
                        {q.lastError}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
