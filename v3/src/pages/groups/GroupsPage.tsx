import { useMemo, useState } from "react";
import SectionHeader from "@/shared/ui/SectionHeader";
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import Badge from "@/shared/ui/Badge";
import Modal from "@/shared/ui/Modal";
import { Card, CardBody } from "@/shared/ui/Card";
import { useAppStore } from "@/shared/state/useAppStore";
import type { AccessGroup, Id } from "@/entities/types";
import { cn } from "@/shared/ui/cn";
import { Plus, Pencil, Trash2 } from "lucide-react";

const PAGE_SIZE = 12;

export default function GroupsPage() {
  const groups = useAppStore((s) => s.groups);
  const employees = useAppStore((s) => s.employees);
  const forms = useAppStore((s) => s.forms);
  const role = useAppStore((s) => s.role);
  const createGroup = useAppStore((s) => s.createGroup);
  const updateGroup = useAppStore((s) => s.updateGroup);
  const deleteGroup = useAppStore((s) => s.deleteGroup);
  const pushToast = useAppStore((s) => s.pushToast);

  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AccessGroup | null>(null);
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [formQuery, setFormQuery] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    includeAllEmployees: false,
    includeAllForms: false,
    employeeIds: [] as Id[],
    formIds: [] as Id[],
    excludedEmployeeIds: [] as Id[],
    excludedFormIds: [] as Id[],
  });

  if (role !== "admin") {
    return (
      <div className="p-6">
        <div className="text-sm text-neutral-500 dark:text-neutral-400">
          Group management is available to admins only.
        </div>
      </div>
    );
  }

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = groups.slice().sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return sorted;
    return sorted.filter((g) => {
      const hay = `${g.name} ${g.description ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [groups, query]);

  const visibleGroups = showAll
    ? filteredGroups
    : filteredGroups.slice(0, PAGE_SIZE);

  const assignedEmployeeIds = useMemo(() => {
    const ids = new Set<Id>();
    if (!employees.length) return ids;
    for (const g of groups) {
      if (g.includeAllEmployees) {
        const excluded = new Set(g.excludedEmployeeIds ?? []);
        for (const e of employees) {
          if (!excluded.has(e.id)) ids.add(e.id);
        }
        continue;
      }
      for (const id of g.employeeIds) ids.add(id);
    }
    return ids;
  }, [employees, groups]);

  const assignedFormIds = useMemo(() => {
    const ids = new Set<Id>();
    if (!forms.length) return ids;
    for (const g of groups) {
      if (g.includeAllForms) {
        const excluded = new Set(g.excludedFormIds ?? []);
        for (const f of forms) {
          if (!excluded.has(f.id)) ids.add(f.id);
        }
        continue;
      }
      for (const id of g.formIds) ids.add(id);
    }
    return ids;
  }, [forms, groups]);

  const unassignedEmployees = employees.filter(
    (e) => !assignedEmployeeIds.has(e.id)
  );
  const unassignedForms = forms.filter((f) => !assignedFormIds.has(f.id));

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      description: "",
      includeAllEmployees: false,
      includeAllForms: false,
      employeeIds: [],
      formIds: [],
      excludedEmployeeIds: [],
      excludedFormIds: [],
    });
    setEmployeeQuery("");
    setFormQuery("");
    setOpen(true);
  };

  const openEdit = (group: AccessGroup) => {
    setEditing(group);
    setForm({
      name: group.name,
      description: group.description ?? "",
      includeAllEmployees: group.includeAllEmployees ?? false,
      includeAllForms: group.includeAllForms ?? false,
      employeeIds: group.employeeIds.slice(),
      formIds: group.formIds.slice(),
      excludedEmployeeIds: group.excludedEmployeeIds?.slice() ?? [],
      excludedFormIds: group.excludedFormIds?.slice() ?? [],
    });
    setEmployeeQuery("");
    setFormQuery("");
    setOpen(true);
  };

  const toggleEmployee = (id: Id) => {
    setForm((s) => ({
      ...s,
      ...(s.includeAllEmployees
        ? {
            excludedEmployeeIds: s.excludedEmployeeIds.includes(id)
              ? s.excludedEmployeeIds.filter((x) => x !== id)
              : [...s.excludedEmployeeIds, id],
          }
        : {
            employeeIds: s.employeeIds.includes(id)
              ? s.employeeIds.filter((x) => x !== id)
              : [...s.employeeIds, id],
          }),
    }));
  };

  const toggleForm = (id: Id) => {
    setForm((s) => ({
      ...s,
      ...(s.includeAllForms
        ? {
            excludedFormIds: s.excludedFormIds.includes(id)
              ? s.excludedFormIds.filter((x) => x !== id)
              : [...s.excludedFormIds, id],
          }
        : {
            formIds: s.formIds.includes(id)
              ? s.formIds.filter((x) => x !== id)
              : [...s.formIds, id],
          }),
    }));
  };

  const filteredEmployees = useMemo(() => {
    const q = employeeQuery.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => {
      const hay = `${e.name} ${e.email ?? ""} ${e.role ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [employees, employeeQuery]);

  const filteredForms = useMemo(() => {
    const q = formQuery.trim().toLowerCase();
    if (!q) return forms;
    return forms.filter((f) => {
      const hay = `${f.name} ${f.subtitle ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [forms, formQuery]);

  const employeeOptions = useMemo(
    () => employees.map((e) => ({ id: e.id, label: e.name })),
    [employees]
  );

  const formOptions = useMemo(
    () => forms.map((f) => ({ id: f.id, label: f.name })),
    [forms]
  );

  const employeeIncludedCount = form.includeAllEmployees
    ? Math.max(0, employees.length - form.excludedEmployeeIds.length)
    : form.employeeIds.length;
  const formIncludedCount = form.includeAllForms
    ? Math.max(0, forms.length - form.excludedFormIds.length)
    : form.formIds.length;
  const employeeBadgeLabel = form.includeAllEmployees
    ? form.excludedEmployeeIds.length
      ? `All except ${form.excludedEmployeeIds.length}`
      : "All employees"
    : `${form.employeeIds.length} selected`;
  const formBadgeLabel = form.includeAllForms
    ? form.excludedFormIds.length
      ? `All except ${form.excludedFormIds.length}`
      : "All forms"
    : `${form.formIds.length} selected`;

  const handleSave = async () => {
    if (!form.name.trim()) {
      pushToast({
        title: "Name required",
        message: "Group name is required.",
        variant: "warning",
      });
      return;
    }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      includeAllEmployees: form.includeAllEmployees,
      includeAllForms: form.includeAllForms,
      employeeIds: form.employeeIds,
      formIds: form.formIds,
      excludedEmployeeIds: form.excludedEmployeeIds,
      excludedFormIds: form.excludedFormIds,
    };
    try {
      if (editing) {
        await updateGroup(editing.id, payload);
        pushToast({
          title: "Group updated",
          message: payload.name,
          variant: "success",
        });
      } else {
        await createGroup(payload);
        pushToast({
          title: "Group created",
          message: payload.name,
          variant: "success",
        });
      }
      setOpen(false);
    } catch (err: any) {
      pushToast({
        title: "Save failed",
        message: err?.message || "Unable to save group",
        variant: "danger",
      });
    }
  };

  return (
    <div className="pb-10">
      <SectionHeader
        title="Groups"
        subtitle="Assign employees and forms to access groups."
        right={
          <div className="flex flex-wrap gap-2">
            <div className="w-full sm:w-64">
              <Input
                placeholder="Search groups"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowAll(false);
                }}
              />
            </div>
            <Button onClick={openCreate}>
              <Plus size={16} /> Add group
            </Button>
          </div>
        }
      />

      {(unassignedEmployees.length > 0 || unassignedForms.length > 0) && (
        <div className="px-4 mt-4 sm:px-6 sm:mt-6">
          <Card>
            <CardBody>
              <div className="text-sm font-semibold">Needs assignment</div>
              <div className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                {unassignedEmployees.length > 0 && (
                  <div>
                    {unassignedEmployees.length} employee(s) are not in any
                    group.
                  </div>
                )}
                {unassignedForms.length > 0 && (
                  <div>
                    {unassignedForms.length} form(s) are not assigned to a
                    group.
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      <div className="px-4 mt-4 sm:px-6 sm:mt-6">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                {filteredGroups.length} group(s)
              </div>
              {filteredGroups.length > PAGE_SIZE && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowAll((s) => !s)}>
                  {showAll ? "Show less" : "Show more"}
                </Button>
              )}
            </div>

            <div className="mt-4 overflow-auto rf-scrollbar">
              <table className="w-full text-sm">
                <thead className="text-xs text-neutral-500 dark:text-neutral-400">
                  <tr className="text-left">
                    <th className="py-2">Group</th>
                    <th className="py-2 hidden sm:table-cell">Members</th>
                    <th className="py-2 hidden sm:table-cell">Forms</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleGroups.map((g) => {
                    const memberSummary = summarizeGroupScope({
                      includeAll: g.includeAllEmployees,
                      selectedIds: g.employeeIds,
                      excludedIds: g.excludedEmployeeIds,
                      options: employeeOptions,
                      emptyLabel: "No members",
                      allLabel: "employees",
                    });
                    const formSummary = summarizeGroupScope({
                      includeAll: g.includeAllForms,
                      selectedIds: g.formIds,
                      excludedIds: g.excludedFormIds,
                      options: formOptions,
                      emptyLabel: "No forms",
                      allLabel: "forms",
                    });
                    return (
                      <tr
                        key={g.id}
                        className="border-t border-neutral-200 dark:border-neutral-800 cursor-pointer transition-colors hover:bg-neutral-50/70 focus-within:bg-neutral-50/70 dark:hover:bg-neutral-900/70 dark:focus-within:bg-neutral-900/70"
                        role="button"
                        tabIndex={0}
                        onClick={() => openEdit(g)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openEdit(g);
                          }
                        }}>
                        <td className="py-3">
                          <div className="font-medium">{g.name}</div>
                          {g.description && (
                            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                              {g.description}
                            </div>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 sm:hidden">
                            <Badge tone="neutral">
                              {memberSummary.badge} members
                            </Badge>
                            <Badge tone="neutral">
                              {formSummary.badge} forms
                            </Badge>
                          </div>
                        </td>
                        <td className="py-3 hidden sm:table-cell">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              tone={
                                memberSummary.count ? "success" : "warning"
                              }>
                              {memberSummary.badge}
                            </Badge>
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                              {memberSummary.detail}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 hidden sm:table-cell">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              tone={formSummary.count ? "success" : "warning"}>
                              {formSummary.badge}
                            </Badge>
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                              {formSummary.detail}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(g);
                              }}>
                              <Pencil size={16} /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (
                                  !window.confirm(`Delete group "${g.name}"?`)
                                )
                                  return;
                                try {
                                  await deleteGroup(g.id);
                                  pushToast({
                                    title: "Group removed",
                                    message: g.name,
                                    variant: "success",
                                  });
                                } catch (err: any) {
                                  pushToast({
                                    title: "Delete failed",
                                    message:
                                      err?.message || "Unable to delete group",
                                    variant: "danger",
                                  });
                                }
                              }}>
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {visibleGroups.length === 0 && (
                    <tr>
                      <td
                        className="py-10 text-center text-sm text-neutral-500 dark:text-neutral-400"
                        colSpan={4}>
                        {query.trim()
                          ? "No groups match that search"
                          : "No groups yet"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit group" : "Add group"}
        className="max-w-5xl">
        <div className="space-y-4">
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              Name
            </div>
            <Input
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            />
          </div>
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              Description
            </div>
            <Input
              value={form.description}
              onChange={(e) =>
                setForm((s) => ({ ...s, description: e.target.value }))
              }
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  Employees
                </div>
                <Badge tone={employeeIncludedCount ? "success" : "warning"}>
                  {employeeBadgeLabel}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={cn(
                    "rf-focus rounded-xl border px-2 py-1 text-xs font-medium",
                    form.includeAllEmployees
                      ? "border-neutral-200 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
                      : "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                  )}
                  onClick={() =>
                    setForm((s) => ({ ...s, includeAllEmployees: false }))
                  }>
                  Selected only
                </button>
                <button
                  type="button"
                  className={cn(
                    "rf-focus rounded-xl border px-2 py-1 text-xs font-medium",
                    form.includeAllEmployees
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                      : "border-neutral-200 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
                  )}
                  onClick={() =>
                    setForm((s) => ({ ...s, includeAllEmployees: true }))
                  }>
                  All except...
                </button>
              </div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {form.includeAllEmployees
                  ? "All current and future employees are included unless excluded below."
                  : "Select individual employees to include in this group."}
              </div>
              <Input
                placeholder="Search employees"
                value={employeeQuery}
                onChange={(e) => setEmployeeQuery(e.target.value)}
              />
              <div className="max-h-56 overflow-auto rf-scrollbar rounded-2xl border border-neutral-200 dark:border-neutral-800 p-2 space-y-2">
                {filteredEmployees.map((e) => (
                  <label
                    key={e.id}
                    className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {e.name}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        {e.role || "Role"} · {e.email || "No email"}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={
                        form.includeAllEmployees
                          ? form.excludedEmployeeIds.includes(e.id)
                          : form.employeeIds.includes(e.id)
                      }
                      onChange={() => toggleEmployee(e.id)}
                    />
                  </label>
                ))}
                {filteredEmployees.length === 0 && (
                  <div className="py-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
                    No matching employees
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  Forms
                </div>
                <Badge tone={formIncludedCount ? "success" : "warning"}>
                  {formBadgeLabel}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={cn(
                    "rf-focus rounded-xl border px-2 py-1 text-xs font-medium",
                    form.includeAllForms
                      ? "border-neutral-200 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
                      : "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                  )}
                  onClick={() =>
                    setForm((s) => ({ ...s, includeAllForms: false }))
                  }>
                  Selected only
                </button>
                <button
                  type="button"
                  className={cn(
                    "rf-focus rounded-xl border px-2 py-1 text-xs font-medium",
                    form.includeAllForms
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                      : "border-neutral-200 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
                  )}
                  onClick={() =>
                    setForm((s) => ({ ...s, includeAllForms: true }))
                  }>
                  All except...
                </button>
              </div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {form.includeAllForms
                  ? "All current and future forms are included unless excluded below."
                  : "Select individual forms to include in this group."}
              </div>
              <Input
                placeholder="Search forms"
                value={formQuery}
                onChange={(e) => setFormQuery(e.target.value)}
              />
              <div className="max-h-56 overflow-auto rf-scrollbar rounded-2xl border border-neutral-200 dark:border-neutral-800 p-2 space-y-2">
                {filteredForms.map((f) => (
                  <label
                    key={f.id}
                    className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-900">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {f.name}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        {f.subtitle || "No subtitle"}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={
                        form.includeAllForms
                          ? form.excludedFormIds.includes(f.id)
                          : form.formIds.includes(f.id)
                      }
                      onChange={() => toggleForm(f.id)}
                    />
                  </label>
                ))}
                {filteredForms.length === 0 && (
                  <div className="py-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
                    No matching forms
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function lookupNames(
  ids: Id[],
  options: Array<{ id: Id; label: string }>,
  limit = 2
) {
  const byId = new Map(options.map((o) => [o.id, o.label]));
  const names = ids.map((id) => byId.get(id)).filter(Boolean) as string[];
  if (names.length === 0) return "";
  const visible = names.slice(0, limit);
  const rest = names.length - visible.length;
  return rest > 0 ? `${visible.join(", ")} +${rest}` : visible.join(", ");
}

function summarizeGroupScope({
  includeAll,
  selectedIds,
  excludedIds,
  options,
  emptyLabel,
  allLabel,
}: {
  includeAll?: boolean;
  selectedIds: Id[];
  excludedIds?: Id[];
  options: Array<{ id: Id; label: string }>;
  emptyLabel: string;
  allLabel: string;
}) {
  const excluded = excludedIds ?? [];
  if (includeAll) {
    const effectiveCount = Math.max(0, options.length - excluded.length);
    const excludedNames = lookupNames(excluded, options);
    const detail = excluded.length
      ? `All except ${excludedNames || excluded.length}`
      : `All ${allLabel}`;
    const badge = excluded.length ? `All except ${excluded.length}` : "All";
    return { count: effectiveCount, detail, badge };
  }
  const count = selectedIds.length;
  const detail = lookupNames(selectedIds, options) || emptyLabel;
  const badge = `${count}`;
  return { count, detail, badge };
}
