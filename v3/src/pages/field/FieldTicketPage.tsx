import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import SectionHeader from "@/shared/ui/SectionHeader";
import Button from "@/shared/ui/Button";
import { Card, CardBody } from "@/shared/ui/Card";
import Badge from "@/shared/ui/Badge";
import Input from "@/shared/ui/Input";
import Textarea from "@/shared/ui/Textarea";
import Modal from "@/shared/ui/Modal";
import Select from "@/shared/ui/Select";
import { useAppStore } from "@/shared/state/useAppStore";
import type {
  Employee,
  Field,
  SignatureRole,
  TicketStatus,
} from "@/entities/types";
import { dateTimeShort } from "@/shared/lib/format";
import { downloadDataUrl } from "@/shared/lib/download";
import { exportRenderedFormPdf } from "@/features/export/exporters";
import RenderedPdfPreview from "@/features/pdf/RenderedPdfPreview";
import SignaturePad from "@/features/field/SignaturePad";
import { resolveMaxLength } from "@/shared/lib/fieldLimits";
import {
  signatureRoleLabel,
  signatureRoles,
} from "@/shared/lib/signatureRoles";
import { ArrowLeft, Save, Send, ImagePlus, FileDown, Eye } from "lucide-react";

const DEFAULT_FONT_SIZE = 12;

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

export default function FieldTicketPage() {
  const { ticketId = "" } = useParams();
  const nav = useNavigate();

  const ticket = useAppStore((s) => s.tickets.find((t) => t.id === ticketId));
  const forms = useAppStore((s) => s.forms);
  const updateTicket = useAppStore((s) => s.updateTicket);
  const employees = useAppStore((s) => s.employees);
  const saveDraft = useAppStore((s) => s.saveDraft);
  const submitTicket = useAppStore((s) => s.submitTicket);
  const apiEnabled = useAppStore((s) => s.apiEnabled);
  const user = useAppStore((s) => s.user);
  const role = useAppStore((s) => s.role);
  const uploadAttachment = useAppStore((s) => s.uploadAttachment);
  const pushToast = useAppStore((s) => s.pushToast);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const [renderOpen, setRenderOpen] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);

  const ctx = useMemo(() => {
    if (!ticket) return null;
    const form = forms.find((f) => f.id === ticket.formId);
    const version =
      form?.versions.find((v) => v.id === ticket.versionId) ??
      form?.versions[0];
    const fields = (version?.fields ?? [])
      .slice()
      .sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x);
    return { form, version, fields };
  }, [ticket, forms]);

  if (!ticket || !ctx?.form || !ctx?.version) {
    return (
      <div className="p-6">
        <div className="text-sm text-neutral-500 dark:text-neutral-400">
          Ticket not found.
        </div>
        <div className="mt-3">
          <Link to="/field" className="underline">
            Back
          </Link>
        </div>
      </div>
    );
  }

  const { form, version, fields } = ctx;
  const renderPdfUrl = version.pdf?.dataUrl ?? version.pdf?.url;
  const fallbackRole: SignatureRole =
    user?.role === "admin" || role === "admin" ? "admin" : "employee";
  const signatureRole = (ticket.signatureRole ?? fallbackRole) as SignatureRole;
  const signatureRoleMeta = signatureRoles.find(
    (role) => role.value === signatureRole
  );
  const signatureSigner = resolveSignatureSigner(
    signatureRole,
    ticket.signature?.signer,
    ticket.assignedTo,
    user?.email
  );

  useEffect(() => {
    if (!ticket.signatureRole) {
      updateTicket(ticket.id, { signatureRole: signatureRole });
    }
  }, [signatureRole, ticket.id, ticket.signatureRole, updateTicket]);

  const updateSignatureRole = (nextRole: SignatureRole) => {
    const currentSigner = ticket.signature?.signer ?? "";
    const nextSigner = defaultSignerForRole(
      nextRole,
      ticket.assignedTo,
      user?.email
    );
    const shouldAutofill =
      !currentSigner.trim() ||
      isAutoSigner(currentSigner, ticket.assignedTo, user?.email);
    updateTicket(ticket.id, {
      signatureRole: nextRole,
      signature: {
        signer: shouldAutofill ? nextSigner : currentSigner,
        dataUrl: ticket.signature?.dataUrl,
      },
    });
  };

  const handleSubmit = useCallback(async () => {
    await submitTicket(ticket.id);
    nav(`/field/submitted/${ticket.id}`);
  }, [submitTicket, ticket.id, nav]);

  const handleExportPdf = useCallback(async () => {
    try {
      await exportRenderedFormPdf(ticket, version);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unable to export rendered PDF";
      pushToast({
        title: "Export failed",
        message,
        variant: "danger",
      });
    }
  }, [ticket, version, pushToast]);

  const handleOverlayValueChange = useCallback(
    (key: string, value: any) => {
      updateTicket(ticket.id, {
        values: { ...ticket.values, [key]: value },
      });
    },
    [ticket.id, ticket.values, updateTicket]
  );

  return (
    <div className="pb-10">
      <SectionHeader
        title={`${form.name}`}
        subtitle={`${ticket.id} · ${ticket.title} · ${
          ticket.assignedTo
        } · ${dateTimeShort(ticket.assignedAt)} · ${version.version}`}
        right={
          <>
            <Button variant="ghost" onClick={() => nav("/field")}>
              <ArrowLeft size={16} /> Back
            </Button>
            <Button
              variant="secondary"
              onClick={() => void saveDraft(ticket.id)}>
              <Save size={16} /> Save Draft
            </Button>
            <Button
              variant="secondary"
              className="bg-orange-100 border-orange-300"
              disabled={!renderPdfUrl}
              onClick={() => setRenderOpen(true)}
              title={
                renderPdfUrl ? "View rendered PDF" : "No PDF uploaded yet"
              }>
              <Eye size={16} /> View Rendered PDF
            </Button>
            <Button onClick={() => void handleSubmit()}>
              <Send size={16} /> Submit (Queued)
            </Button>
          </>
        }
      />

      <div className="px-4 mt-4 sm:px-6 sm:mt-6 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4 items-start">
        <div className="flex flex-col gap-4">
          <Card>
            <CardBody>
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">Fields</div>
                <Badge tone={ticketStatusTone(ticket.status)}>
                  {ticket.status}
                </Badge>
              </div>

              <div className="mt-4 space-y-4">
                {fields.length === 0 && (
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">
                    This version has no mapped fields yet. Open the Builder and
                    add fields.
                  </div>
                )}

                {fields.map((f) => (
                  <FieldInput
                    key={f.id}
                    field={f}
                    value={ticket.values[f.key]}
                    employees={employees}
                    creatorName={ticket.assignedTo}
                    signature={ticket.signature}
                    onChange={(val) => {
                      updateTicket(ticket.id, {
                        values: { ...ticket.values, [f.key]: val },
                      });
                    }}
                    onSignature={(sig) =>
                      updateTicket(ticket.id, {
                        signature: { signer: signatureSigner, dataUrl: sig },
                      })
                    }
                    onSigner={(name) =>
                      updateTicket(ticket.id, {
                        signature: {
                          signer: name,
                          dataUrl: ticket.signature?.dataUrl,
                        },
                      })
                    }
                  />
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Live PDF Overlay</div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    Fields are pinned to the PDF as you type.
                  </div>
                </div>
                {!renderPdfUrl && <Badge tone="warning">No PDF</Badge>}
              </div>
              <div className="mt-3">
                {renderPdfUrl ? (
                  <RenderedPdfPreview
                    pdfUrl={renderPdfUrl}
                    fields={version.fields}
                    ticket={ticket}
                    interactive
                    employees={employees}
                    onValueChange={handleOverlayValueChange}
                    onSignatureClick={() => setSignatureOpen(true)}
                    onPhotoClick={() => attachmentInputRef.current?.click()}
                  />
                ) : (
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">
                    Upload a PDF in the Builder to enable the overlay preview.
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardBody>
              <div className="text-sm font-semibold">Photo Attachments</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {apiEnabled ? "Stored on server" : "Stored locally (demo)"}
              </div>

              <input
                ref={attachmentInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (apiEnabled) {
                    void uploadAttachment(ticket.id, file)
                      .then(() =>
                        pushToast({
                          title: "Attachment added",
                          message: file.name,
                          variant: "success",
                        })
                      )
                      .catch((err) =>
                        pushToast({
                          title: "Upload failed",
                          message:
                            err?.message || "Unable to upload attachment",
                          variant: "danger",
                        })
                      );
                  } else {
                    const reader = new FileReader();
                    reader.onload = () => {
                      const dataUrl = String(reader.result);
                      const next = [
                        ...ticket.attachments,
                        {
                          id: `${Date.now()}_${Math.random()}`,
                          name: file.name,
                          mime: file.type,
                          dataUrl,
                        },
                      ];
                      updateTicket(ticket.id, { attachments: next });
                      useAppStore.getState().pushToast({
                        title: "Attachment added",
                        message: file.name,
                        variant: "success",
                      });
                    };
                    reader.readAsDataURL(file);
                  }
                  e.currentTarget.value = "";
                }}
              />
              <Button
                variant="secondary"
                type="button"
                onClick={() => attachmentInputRef.current?.click()}>
                <ImagePlus size={16} /> Add photo
              </Button>

              <div className="mt-3 flex flex-col gap-2">
                {ticket.attachments.length === 0 && (
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">
                    No photos
                  </div>
                )}
                {ticket.attachments.map((a) => {
                  const src = attachmentSrc(a);
                  return (
                    <div
                      key={a.id}
                      className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">
                            {a.name}
                          </div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                            {a.mime}
                          </div>
                        </div>
                        <button
                          className="rf-focus rounded-xl px-2 py-1 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900"
                          onClick={() => {
                            if (a.dataUrl)
                              return downloadDataUrl(a.name, a.dataUrl);
                            if (a.url)
                              window.open(
                                a.url,
                                "_blank",
                                "noopener,noreferrer"
                              );
                          }}>
                          <FileDown size={16} />
                        </button>
                      </div>
                      {src && (
                        <img
                          src={src}
                          alt={a.name}
                          className="mt-2 w-full rounded-xl border border-neutral-200 dark:border-neutral-800"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="text-sm font-semibold">Signature</div>
              <div className="mt-3 space-y-2">
                <div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                    Signer role
                  </div>
                  <Select
                    value={signatureRole}
                    onChange={(e) =>
                      updateSignatureRole(e.target.value as SignatureRole)
                    }>
                    {signatureRoles.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </Select>
                  {signatureRoleMeta?.helper && (
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                      {signatureRoleMeta.helper}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                    Signer
                  </div>
                  <Input
                    value={signatureSigner}
                    onChange={(e) =>
                      updateTicket(ticket.id, {
                        signature: {
                          signer: e.target.value,
                          dataUrl: ticket.signature?.dataUrl,
                        },
                      })
                    }
                  />
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                    Displayed as {signatureRoleLabel(signatureRole)}.
                  </div>
                </div>
                <SignaturePad
                  value={ticket.signature?.dataUrl ?? ticket.signature?.url}
                  onChange={(sig) =>
                    updateTicket(ticket.id, {
                      signature: { signer: signatureSigner, dataUrl: sig },
                    })
                  }
                />
              </div>
            </CardBody>
          </Card>

          {ticket.lastError && (
            <Card>
              <CardBody>
                <div className="text-sm font-semibold">Error</div>
                <div className="mt-2 text-sm text-red-600 dark:text-red-300">
                  {ticket.lastError}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={signatureOpen}
        onClose={() => setSignatureOpen(false)}
        title="Signature"
      >
        <div className="space-y-3">
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              Signer
            </div>
            <Input
              value={signatureSigner}
              onChange={(e) =>
                updateTicket(ticket.id, {
                  signature: {
                    signer: e.target.value,
                    dataUrl: ticket.signature?.dataUrl,
                  },
                })
              }
            />
          </div>
          <SignaturePad
            value={ticket.signature?.dataUrl ?? ticket.signature?.url}
            onChange={(sig) =>
              updateTicket(ticket.id, {
                signature: { signer: signatureSigner, dataUrl: sig },
              })
            }
          />
        </div>
      </Modal>

      <Modal
        open={renderOpen}
        onClose={() => setRenderOpen(false)}
        title="Rendered PDF"
        className="max-w-5xl">
        {!renderPdfUrl ? (
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            No PDF uploaded for this version yet.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                {ticket.id} · {ticket.assignedTo} · {version.version}
              </div>
              <Button variant="secondary" onClick={handleExportPdf}>
                <FileDown size={16} /> Download Rendered PDF
              </Button>
            </div>
            <RenderedPdfPreview
              pdfUrl={renderPdfUrl}
              fields={version.fields}
              ticket={ticket}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}

function attachmentSrc(attachment: { url?: string; dataUrl?: string }) {
  return attachment.url || attachment.dataUrl || "";
}

function defaultSignerForRole(
  role: SignatureRole,
  assignedTo: string,
  userEmail?: string
) {
  if (role === "employee") return assignedTo;
  if (role === "admin") return userEmail || "Admin";
  return "";
}

function isAutoSigner(name: string, assignedTo: string, userEmail?: string) {
  const trimmed = name.trim();
  if (!trimmed) return true;
  if (trimmed === assignedTo) return true;
  if (userEmail && trimmed === userEmail) return true;
  if (trimmed === "Admin") return true;
  return false;
}

function resolveSignatureSigner(
  role: SignatureRole,
  signer: string | undefined,
  assignedTo: string,
  userEmail?: string
) {
  if (signer && signer.trim()) return signer;
  return defaultSignerForRole(role, assignedTo, userEmail);
}

function FieldInput({
  field,
  value,
  employees,
  creatorName,
  signature,
  onChange,
  onSignature,
  onSigner,
}: {
  field: Field;
  value: any;
  employees: Employee[];
  creatorName: string;
  signature?: { signer: string; dataUrl?: string };
  onChange: (v: any) => void;
  onSignature: (dataUrl?: string) => void;
  onSigner: (name: string) => void;
}) {
  const hint = field.hint;
  const help = field.helpText;
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);
  const fontSize = field.fontSize ?? DEFAULT_FONT_SIZE;
  const readOnly = field.readOnly === true;
  const autoNote =
    field.autoValue === "today" && field.type === "date"
      ? "Auto-filled with today's date."
      : field.autoValue === "creator" && field.type === "text"
      ? "Auto-filled with assigned employee."
      : "";
  const options = (field.options ?? [])
    .map((opt) => opt.trim())
    .filter(Boolean);
  const maxLength = resolveMaxLength(field);

  useEffect(() => {
    if (!field.autoValue) return;
    if (value !== undefined && value !== null && value !== "") return;
    if (field.autoValue === "today" && field.type === "date") {
      const today = localIsoDate();
      if (today !== value) onChange(today);
      return;
    }
    if (field.autoValue === "creator" && field.type === "text" && creatorName) {
      if (creatorName !== value) onChange(creatorName);
    }
  }, [creatorName, field.autoValue, field.type, onChange, value]);

  if (field.type === "checkbox") {
    return (
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-medium">
              {field.label}
              {field.required ? " *" : ""}
            </div>
            {help && (
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {help}
              </div>
            )}
          </div>
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            disabled={readOnly}
          />
        </div>
      </div>
    );
  }

  if (field.type === "signature") {
    return (
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3">
        <div className="font-medium">
          {field.label}
          {field.required ? " *" : ""}
        </div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Use the Signature panel on the right.
        </div>
      </div>
    );
  }

  if (field.type === "photo") {
    return (
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3">
        <div className="font-medium">
          {field.label}
          {field.required ? " *" : ""}
        </div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Use the Photo Attachments panel on the right.
        </div>
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3">
        <div className="font-medium">
          {field.label}
          {field.required ? " *" : ""}
        </div>
        {help && (
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {help}
          </div>
        )}
        <div className="mt-2">
          <select
            className="rf-focus h-10 w-full rounded-2xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-950"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={readOnly || options.length === 0}
            style={{ fontSize }}>
            <option value="">
              {options.length ? "Select option" : "No options"}
            </option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        {options.length === 0 && (
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Add options in the Builder.
          </div>
        )}
        {hint && (
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {hint}
          </div>
        )}
      </div>
    );
  }

  if (field.type === "radio") {
    return (
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3">
        <div className="font-medium">
          {field.label}
          {field.required ? " *" : ""}
        </div>
        {help && (
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {help}
          </div>
        )}
        <div className="mt-2 space-y-2" style={{ fontSize }}>
          {options.length === 0 ? (
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              Add options in the Builder.
            </div>
          ) : (
            options.map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`radio_${field.id}`}
                  value={opt}
                  checked={value === opt}
                  onChange={(e) => onChange(e.target.value)}
                  disabled={readOnly}
                />
                <span>{opt}</span>
              </label>
            ))
          )}
        </div>
        {hint && (
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {hint}
          </div>
        )}
      </div>
    );
  }

  if (field.type === "employee") {
    const q = search.trim().toLowerCase();
    const filtered = employees
      .filter((e) => e.active)
      .filter((e) => {
        const hay = `${e.name} ${e.email ?? ""} ${e.role ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
    const selected = employees.find((e) => e.name === value);
    let visible = expanded ? filtered : filtered.slice(0, 8);
    if (selected && !visible.some((e) => e.id === selected.id)) {
      visible = [...visible, selected];
    }
    return (
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3">
        <div className="font-medium">
          {field.label}
          {field.required ? " *" : ""}
        </div>
        {help && (
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {help}
          </div>
        )}
        <div className="mt-2 space-y-2">
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setExpanded(false);
            }}
            style={{ fontSize }}
            disabled={readOnly}
          />
          <select
            className="rf-focus h-10 w-full rounded-2xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-950"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            style={{ fontSize }}
            disabled={readOnly}>
            <option value="">Select employee</option>
            {visible.map((e) => (
              <option key={e.id} value={e.name}>
                {e.name}
                {e.role ? ` · ${e.role}` : ""}
              </option>
            ))}
          </select>
          {filtered.length === 0 && (
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              No matching employees
            </div>
          )}
          {filtered.length > 8 && (
            <button
              type="button"
              className="rf-focus text-xs text-neutral-600 dark:text-neutral-300 underline"
              onClick={() => setExpanded((s) => !s)}>
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
        {hint && (
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {hint}
          </div>
        )}
      </div>
    );
  }

  const common = (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium">
            {field.label}
            {field.required ? " *" : ""}
          </div>
          {help && (
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {help}
            </div>
          )}
        </div>
      </div>

      <div className="mt-2">
        {field.type === "date" ? (
          <Input
            type="date"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            style={{ fontSize }}
            readOnly={readOnly}
          />
        ) : field.type === "numeric" ? (
          <Input
            type="number"
            value={value ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              const trimmed = maxLength ? raw.slice(0, maxLength) : raw;
              onChange(trimmed === "" ? "" : Number(trimmed));
            }}
            style={{ fontSize }}
            readOnly={readOnly}
            maxLength={maxLength}
          />
        ) : (
          <Input
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            style={{ fontSize }}
            readOnly={readOnly}
            maxLength={maxLength}
          />
        )}
      </div>

      {hint && (
        <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          {hint}
        </div>
      )}
      {autoNote && (
        <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          {autoNote}
          {readOnly ? "" : " (editable)"}
        </div>
      )}
      {field.type === "numeric" &&
        field.validation.kind === "range" &&
        value !== "" &&
        value != null && (
          <RangeHint
            value={Number(value)}
            min={field.validation.min}
            max={field.validation.max}
          />
        )}
    </div>
  );

  if (field.key === "notes") {
    return (
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3">
        <div className="font-medium">
          {field.label}
          {field.required ? " *" : ""}
        </div>
        <div className="mt-2">
          <Textarea
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            style={{ fontSize }}
            readOnly={readOnly}
            maxLength={maxLength}
          />
        </div>
        {hint && (
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {hint}
          </div>
        )}
        {autoNote && (
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {autoNote}
            {readOnly ? "" : " (editable)"}
          </div>
        )}
      </div>
    );
  }

  return common;
}

function RangeHint({
  value,
  min,
  max,
}: {
  value: number;
  min: number;
  max: number;
}) {
  const ok = value >= min && value <= max;
  return (
    <div
      className={
        ok
          ? "text-xs text-emerald-600 dark:text-emerald-300 mt-1"
          : "text-xs text-amber-600 dark:text-amber-300 mt-1"
      }>
      {ok ? "Within allowed range." : `Out of range (${min}–${max}).`}
    </div>
  );
}

function localIsoDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}
