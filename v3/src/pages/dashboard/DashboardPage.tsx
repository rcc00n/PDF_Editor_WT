import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Card,
  CardBody,
  CardHeader,
  CardSub,
  CardTitle,
} from "@/shared/ui/Card";
import SectionHeader from "@/shared/ui/SectionHeader";
import Button from "@/shared/ui/Button";
import Badge from "@/shared/ui/Badge";
import Input from "@/shared/ui/Input";
import Modal from "@/shared/ui/Modal";
import { useAppStore } from "@/shared/state/useAppStore";
import { dateTimeShort } from "@/shared/lib/format";
import { ArrowRight, Plus } from "lucide-react";
import type {
  AccessGroup,
  Employee,
  FormTemplate,
  TicketStatus,
} from "@/entities/types";

type ResolveAvailableFormsArgs = {
  forms: FormTemplate[];
  groups: AccessGroup[];
  employees: Employee[];
  role: string;
  userEmail?: string | null;
};

function resolveAvailableForms({
  forms,
  groups,
  employees,
  role,
  userEmail,
}: ResolveAvailableFormsArgs): FormTemplate[] {
  if (role === "admin") return forms;
  const email = userEmail?.trim().toLowerCase();
  if (!email) return forms;
  const employee =
    employees.find((e) => (e.email ?? "").trim().toLowerCase() === email) ??
    null;
  if (!employee) return forms;
  const allowed = new Set<string>();
  for (const group of groups) {
    if (group.employeeIds.includes(employee.id)) {
      for (const formId of group.formIds) allowed.add(formId);
    }
  }
  if (!allowed.size) return forms;
  return forms.filter((form) => allowed.has(form.id));
}

export default function DashboardPage() {
  const nav = useNavigate();
  const forms = useAppStore((s) => s.forms);
  const groups = useAppStore((s) => s.groups);
  const role = useAppStore((s) => s.role);
  const employees = useAppStore((s) => s.employees);
  const user = useAppStore((s) => s.user);
  const createForm = useAppStore((s) => s.createForm);
  const pushToast = useAppStore((s) => s.pushToast);
  const tickets = useAppStore((s) => s.tickets);
  const lastSync = useAppStore((s) => s.lastSyncSuccess);
  const canEdit = role === "admin";
  const [newFormOpen, setNewFormOpen] = useState(false);
  const [newFormName, setNewFormName] = useState("");
  const [creatingForm, setCreatingForm] = useState(false);

  const handleCreateForm = async () => {
    if (creatingForm) return;
    setCreatingForm(true);
    try {
      const id = await createForm(newFormName);
      setNewFormOpen(false);
      setNewFormName("");
      nav(`/builder/${id}`);
    } catch (err: any) {
      pushToast({
        title: "Create failed",
        message: err?.message || "Unable to create form",
        variant: "danger",
      });
    } finally {
      setCreatingForm(false);
    }
  };

  const currentEmployee = useMemo(() => {
    const email = user?.email?.trim().toLowerCase();
    if (!email) return null;
    return (
      employees.find((e) => (e.email ?? "").trim().toLowerCase() === email) ??
      null
    );
  }, [employees, user?.email]);

  const availableForms = useMemo(() => {
    return resolveAvailableForms({
      forms,
      groups,
      employees,
      role,
      userEmail: user?.email,
    });
  }, [employees, forms, groups, role, user?.email]);

  const scopedTickets = useMemo(() => {
    if (role === "admin") return tickets;
    const matched = currentEmployee?.name?.trim().toLowerCase();
    const email = user?.email?.trim().toLowerCase();
    if (!matched && !email) return tickets;
    return tickets.filter((t) => {
      const assigned = t.assignedTo.trim().toLowerCase();
      return (matched && assigned === matched) || (email && assigned === email);
    });
  }, [currentEmployee?.name, role, tickets, user?.email]);

  const summary = useMemo(() => {
    const now = new Date();
    const sameDay = (iso: string) => {
      const d = new Date(iso);
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    };

    let pending = 0;
    let attention = 0;
    let syncedToday = 0;
    let pendingReview = 0;

    for (const t of scopedTickets) {
      if (
        t.status === "pending" ||
        t.status === "queued" ||
        t.status === "in_progress"
      )
        pending += 1;
      if (t.status === "error" || t.status === "queued" || t.status === "pending") {
        attention += 1;
      }
      if (t.status === "synced" && sameDay(t.updatedAt)) syncedToday += 1;
    }

    const reviewSource = role === "admin" ? tickets : scopedTickets;
    for (const t of reviewSource) {
      if (t.status === "synced" && t.approvalState !== "approved") {
        pendingReview += 1;
      }
    }

    return { pending, attention, syncedToday, pendingReview };
  }, [role, scopedTickets, tickets]);

  const formsVisible = useMemo(() => availableForms.slice(0, 6), [availableForms]);

  const recentTickets = useMemo(
    () =>
      scopedTickets
        .slice()
        .sort((a, b) => b.assignedAt.localeCompare(a.assignedAt))
        .slice(0, 4),
    [scopedTickets]
  );

  return (
    <div className="pb-10">
      <SectionHeader
        title="Dashboard"
        subtitle="A clean snapshot of forms and field activity."
        right={
          <>
            {canEdit && (
              <Button
                onClick={() => {
                  setNewFormName("");
                  setNewFormOpen(true);
                }}>
                <Plus size={16} /> Create New Form
              </Button>
            )}
            <Button variant="secondary" onClick={() => nav("/field")}> 
              Open Field App <ArrowRight size={16} />
            </Button>
          </>
        }
      />

      <div className="px-4 mt-4 sm:px-6 sm:mt-6">
        <Card>
          <CardHeader>
            <CardTitle>At a Glance</CardTitle>
            <CardSub>
              {lastSync ? `Last sync ${dateTimeShort(lastSync)}` : "Online"}
            </CardSub>
          </CardHeader>
          <CardBody className="pt-2">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryStat label="Pending" value={summary.pending} />
              <SummaryStat label="Needs attention" value={summary.attention} />
              <SummaryStat label="Synced today" value={summary.syncedToday} />
              <SummaryStat label="Pending review" value={summary.pendingReview} />
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="px-4 mt-4 sm:px-6 sm:mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Forms</CardTitle>
                <CardSub>Open a template to edit or publish.</CardSub>
              </div>
              <Button variant="secondary" onClick={() => nav("/builder")}>Open Builder</Button>
            </div>
          </CardHeader>
          <CardBody>
            {formsVisible.length === 0 ? (
              <div className="text-sm text-neutral-500">No forms available.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {formsVisible.map((form) => {
                  const version =
                    form.versions.find((v) => v.status === "active") ??
                    form.versions[0];
                  return (
                    <Link
                      key={form.id}
                      to={`/builder/${form.id}`}
                      className="rf-focus flex items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-white px-3 py-3 hover:bg-orange-50"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{form.name}</div>
                        <div className="text-xs text-neutral-500 truncate">
                          {form.subtitle ?? "Template"} · {version.version}
                        </div>
                      </div>
                      <Badge
                        tone={
                          version.status === "active"
                            ? "success"
                            : version.status === "draft"
                            ? "warning"
                            : "neutral"
                        }
                      >
                        {version.status}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Recent Tickets</CardTitle>
                <CardSub>Latest assignments and updates.</CardSub>
              </div>
              <Button variant="secondary" onClick={() => nav("/field")}>View Field App</Button>
            </div>
          </CardHeader>
          <CardBody>
            {recentTickets.length === 0 ? (
              <div className="text-sm text-neutral-500">No tickets yet.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {recentTickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    to={`/field/ticket/${ticket.id}`}
                    className="rf-focus flex items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-white px-3 py-3 hover:bg-orange-50"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {ticket.id} · {ticket.title}
                      </div>
                      <div className="text-xs text-neutral-500 truncate">
                        {ticket.assignedTo} · {dateTimeShort(ticket.assignedAt)}
                      </div>
                    </div>
                    <Badge tone={ticketTone(ticket.status)}>{ticket.status}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Modal
        open={newFormOpen}
        onClose={() => setNewFormOpen(false)}
        title="Create new form"
      >
        <div className="space-y-3">
          <div className="text-sm text-neutral-500">
            Enter a name for the template. Leave it blank and we will assign a short
            unique name automatically.
          </div>
          <Input
            placeholder="Form name"
            value={newFormName}
            onChange={(e) => setNewFormName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleCreateForm();
              }
            }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setNewFormOpen(false)}>
              Cancel
            </Button>
            <Button disabled={creatingForm} onClick={handleCreateForm}>
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-orange-50/70 px-4 py-3">
      <div className="text-xs text-orange-700/70">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function ticketTone(
  status: TicketStatus
): "neutral" | "success" | "warning" | "danger" {
  if (status === "synced") return "success";
  if (status === "error") return "danger";
  if (status === "queued" || status === "pending") return "warning";
  return "neutral";
}
