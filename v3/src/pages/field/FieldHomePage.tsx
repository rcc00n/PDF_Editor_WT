import { Link, useNavigate } from "react-router-dom";
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
import { useAppStore } from "@/shared/state/useAppStore";
import { dateTimeShort } from "@/shared/lib/format";
import { Plus, ListChecks } from "lucide-react";
import Modal from "@/shared/ui/Modal";
import Input from "@/shared/ui/Input";
import Select from "@/shared/ui/Select";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  extractRig,
  filterTickets,
  groupTicketsByForm,
} from "@/shared/lib/ticketFilters";
import type { TicketStatus } from "@/entities/types";

/** Returns consistent tone for ticket status */
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

export default function FieldHomePage() {
  const nav = useNavigate();
  const tickets = useAppStore((s) => s.tickets);
  const queue = useAppStore((s) => s.queue);
  const lastSync = useAppStore((s) => s.lastSyncSuccess);
  const forms = useAppStore((s) => s.forms);
  const groups = useAppStore((s) => s.groups);
  const employees = useAppStore((s) => s.employees);
  const user = useAppStore((s) => s.user);
  const role = useAppStore((s) => s.role);
  const createTicket = useAppStore((s) => s.createTicket);
  const pushToast = useAppStore((s) => s.pushToast);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Pending Forms");
  const [assignedTo, setAssignedTo] = useState("Technician");
  const [formId, setFormId] = useState(forms[0]?.id ?? "");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rigQuery, setRigQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.active),
    [employees]
  );
  const currentEmployee = useMemo(() => {
    const email = user?.email?.trim().toLowerCase();
    if (!email) return null;
    return (
      employees.find((e) => (e.email ?? "").trim().toLowerCase() === email) ??
      null
    );
  }, [employees, user?.email]);
  const defaultAssignee =
    currentEmployee?.name ?? activeEmployees[0]?.name ?? "Technician";

  useEffect(() => {
    if (!assignedTo || assignedTo === "Technician") {
      if (defaultAssignee && assignedTo !== defaultAssignee) {
        setAssignedTo(defaultAssignee);
      }
    }
  }, [assignedTo, defaultAssignee]);

  const availableForms = useMemo(() => {
    if (role === "admin") return forms;
    if (!groups.length) return forms;
    const email = user?.email?.trim().toLowerCase();
    if (!email) return forms;
    const employee = employees.find(
      (e) => (e.email ?? "").toLowerCase() === email
    );
    if (!employee) return forms;
    const allowed = new Set<string>();
    for (const g of groups) {
      const excludedEmployees = g.excludedEmployeeIds ?? [];
      const includesEmployee = g.includeAllEmployees
        ? !excludedEmployees.includes(employee.id)
        : g.employeeIds.includes(employee.id);
      if (!includesEmployee) continue;
      if (g.includeAllForms) {
        const excludedForms = new Set(g.excludedFormIds ?? []);
        for (const f of forms) {
          if (!excludedForms.has(f.id)) allowed.add(f.id);
        }
        continue;
      }
      for (const id of g.formIds) allowed.add(id);
    }
    if (!allowed.size) return [];
    return forms.filter((f) => allowed.has(f.id));
  }, [employees, forms, groups, role, user?.email]);

  useEffect(() => {
    if (!availableForms.length) {
      if (formId) setFormId("");
      return;
    }
    if (!formId || !availableForms.some((f) => f.id === formId)) {
      setFormId(availableForms[0].id);
    }
  }, [availableForms, formId]);

  const activeVersions = useMemo(() => {
    const f = availableForms.find((x) => x.id === formId);
    const v = f?.versions.find((v) => v.status === "active") ?? f?.versions[0];
    return { f, v };
  }, [availableForms, formId]);
  const canCreate = Boolean(activeVersions.v);

  const queuedTickets = queue.filter(
    (q) => q.status === "pending" || q.status === "in_progress"
  ).length;
  const needsRetry = queue.filter((q) => q.status === "failed").length;

  const filteredTickets = useMemo(
    () =>
      filterTickets(tickets, {
        from: fromDate,
        to: toDate,
        rig: rigQuery,
        status: statusFilter,
      }),
    [tickets, fromDate, toDate, rigQuery, statusFilter]
  );

  const groupedTickets = useMemo(
    () => groupTicketsByForm(filteredTickets, forms),
    [filteredTickets, forms]
  );

  const handleCreateTicket = useCallback(async () => {
    const { v } = activeVersions;
    if (!v) return;
    try {
      const id = await createTicket(
        formId,
        v.id,
        (title || "Pending Forms").trim(),
        (assignedTo || "Technician").trim()
      );
      setOpen(false);
      nav(`/field/ticket/${id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unable to create ticket";
      pushToast({ title: "Ticket failed", message, variant: "danger" });
    }
  }, [activeVersions, createTicket, formId, title, assignedTo, nav, pushToast]);

  return (
    <div className="pb-10">
      <SectionHeader
        title="Field App"
        subtitle="Offline mode, drafts, and queued submits."
        right={
          <>
            <Button variant="secondary" onClick={() => nav("/queue")}>
              <ListChecks size={16} /> View Queue
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setOpen(true);
              }}>
              <Plus size={16} /> Pending Forms
            </Button>
          </>
        }
      />

      <div className="px-4 mt-4 sm:px-6 sm:mt-6 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Daily Field Tickets</CardTitle>
            <CardSub>Tap a ticket to open the form</CardSub>
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
              {groupedTickets.map((group) => (
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
                        to={`/field/ticket/${t.id}`}
                        className="rf-focus rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                        <div className="flex items-center justify-between gap-3">
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
                          <Badge tone={ticketStatusTone(t.status)}>
                            {t.status}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
              {groupedTickets.length === 0 && (
                <div className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                  Nothing here
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Offline Queue Status</CardTitle>
              <CardSub>Sync happens automatically when online</CardSub>
            </CardHeader>
            <CardBody>
              <div className="flex items-center justify-between">
                <div className="text-sm">Queued tickets</div>
                <Badge tone={queuedTickets ? "warning" : "neutral"}>
                  {queuedTickets}
                </Badge>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-sm">Requires retry</div>
                <Badge tone={needsRetry ? "danger" : "neutral"}>
                  {needsRetry}
                </Badge>
              </div>
              <div className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                Last success: {lastSync ? dateTimeShort(lastSync) : "—"}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Device</CardTitle>
              <CardSub>Touch-friendly UI</CardSub>
            </CardHeader>
            <CardBody>
              <div className="text-sm">Tablet / Rugged device</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Drafts and attachments are stored locally (demo).
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Create ticket">
        <div className="space-y-3">
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              Form
            </div>
            {availableForms.length === 0 ? (
              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                No forms assigned to your group yet.
              </div>
            ) : (
              <Select
                value={formId}
                onChange={(e) => setFormId(e.target.value)}>
                {availableForms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            )}
          </div>
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              Title
            </div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              Assigned to
            </div>
            {activeEmployees.length ? (
              <Select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}>
                {activeEmployees.map((e) => (
                  <option key={e.id} value={e.name}>
                    {e.name}
                    {e.role ? ` · ${e.role}` : ""}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              />
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!canCreate} onClick={handleCreateTicket}>
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
