import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  UNSAFE_NavigationContext,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import SectionHeader from "@/shared/ui/SectionHeader";
import Button from "@/shared/ui/Button";
import Badge from "@/shared/ui/Badge";
import Input from "@/shared/ui/Input";
import Textarea from "@/shared/ui/Textarea";
import Select from "@/shared/ui/Select";
import { Card, CardBody } from "@/shared/ui/Card";
import Modal from "@/shared/ui/Modal";
import { useAppStore } from "@/shared/state/useAppStore";
import type { Field, FieldType, Validation } from "@/entities/types";
import { uid } from "@/shared/lib/ids";
import {
  suggestedMaxLength,
  supportsFieldMaxLength,
} from "@/shared/lib/fieldLimits";
import { useElementSize } from "@/shared/hooks/useElementSize";
import PdfPageCanvas from "@/features/pdf/PdfPageCanvas";
import { cn } from "@/shared/ui/cn";
import { Eye, Upload, CheckCircle2, Trash2, Pencil } from "lucide-react";

type ToolPreset = {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  autoValue?: Field["autoValue"];
  readOnly?: boolean;
  validation?: Validation;
  keyBase?: string;
  hint?: string;
  helpText?: string;
  description?: string;
};

const TOOL_SECTIONS: Array<{ title?: string; tools: ToolPreset[] }> = [
  {
    tools: [
      {
        id: "required_text",
        label: "Required Text",
        type: "text",
        required: true,
        description: "Text input (required).",
      },
      {
        id: "optional_text",
        label: "Optional Text",
        type: "text",
        description: "Text input (optional).",
      },
      {
        id: "custom_list",
        label: "Customized List",
        type: "select",
        options: ["Option 1", "Option 2"],
        description: "Dropdown with custom options.",
      },
      {
        id: "list_yes_no",
        label: "List Yes, No",
        type: "select",
        options: ["Yes", "No"],
        description: "Dropdown with Yes/No.",
      },
      {
        id: "list_yes_no_na",
        label: "List Yes, No, or NA",
        type: "select",
        options: ["Yes", "No", "NA"],
        description: "Dropdown with Yes/No/NA.",
      },
      {
        id: "checkbox",
        label: "Check Box",
        type: "checkbox",
        description: "Single checkbox.",
      },
      {
        id: "required_signature",
        label: "Required Signature",
        type: "signature",
        required: true,
        description: "Signature block (required).",
      },
      {
        id: "radio",
        label: "Radio Buttons",
        type: "radio",
        options: ["Option 1", "Option 2"],
        description: "Single-choice radio list.",
      },
      {
        id: "crew_member",
        label: "Crew Member",
        type: "employee",
        description: "Select from employees.",
      },
      {
        id: "crew_signature",
        label: "Crew Signature",
        type: "signature",
        description: "Signature block.",
      },
      {
        id: "manager",
        label: "Manager",
        type: "employee",
        description: "Select from employees.",
      },
      {
        id: "client_name",
        label: "Client Name",
        type: "text",
        description: "Text input for client.",
      },
      {
        id: "current_date",
        label: "Current Date",
        type: "date",
        autoValue: "today",
        readOnly: true,
        description: "Auto-filled with today's date.",
      },
      {
        id: "creator",
        label: "Creator",
        type: "text",
        autoValue: "creator",
        readOnly: true,
        description: "Auto-filled with assigned user.",
      },
      {
        id: "unit_number",
        label: "Unit #",
        type: "numeric",
        validation: { kind: "range", min: 0, max: 999999 },
        keyBase: "unit_number",
        description: "Numeric unit identifier.",
      },
      {
        id: "uwi_location",
        label: "UWI location",
        type: "text",
        description: "Text input for UWI location.",
      },
      {
        id: "employee_list",
        label: "Employee List",
        type: "employee",
        description: "Select from employees.",
      },
    ],
  },
  {
    title: "Extras",
    tools: [
      {
        id: "photo",
        label: "Photo",
        type: "photo",
        description: "Attachment placeholder.",
      },
    ],
  },
];

const ALL_TOOLS = TOOL_SECTIONS.flatMap((section) => section.tools);
const TOOL_BY_ID = Object.fromEntries(
  ALL_TOOLS.map((tool) => [tool.id, tool])
) as Record<string, ToolPreset>;
const DEFAULT_TOOL_ID = ALL_TOOLS[0]?.id ?? null;

const GRID_PX = 6;
const MIN_FIELD_SIZE = 0.03;
const DEFAULT_FONT_SIZE = 12;

export default function BuilderPage() {
  const { formId = "" } = useParams();
  const location = useLocation();
  const nav = useNavigate();

  const forms = useAppStore((s) => s.forms);
  const role = useAppStore((s) => s.role);
  const apiEnabled = useAppStore((s) => s.apiEnabled);
  const setPdf = useAppStore((s) => s.setPdf);
  const setCanvasSize = useAppStore((s) => s.setCanvasSize);
  const uploadPdf = useAppStore((s) => s.uploadPdf);
  const publishVersion = useAppStore((s) => s.publishVersion);
  const upsertField = useAppStore((s) => s.upsertField);
  const deleteField = useAppStore((s) => s.deleteField);
  const renameForm = useAppStore((s) => s.renameForm);
  const pushToast = useAppStore((s) => s.pushToast);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);

  const [activeToolId, setActiveToolId] = useState<string | null>(DEFAULT_TOOL_ID)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [numPages, setNumPages] = useState(1)
  const canvasFocus = false
  const form = forms.find((f) => f.id === formId);
  const vFromQuery = new URLSearchParams(location.search).get("v");

  const version = useMemo(() => {
    if (!form) return undefined;
    if (vFromQuery)
      return form.versions.find((v) => v.id === vFromQuery) ?? form.versions[0];
    return form.versions[0];
  }, [form, vFromQuery]);

  const [activeToolId, setActiveToolId] = useState<string | null>(
    DEFAULT_TOOL_ID
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(1);
  const [canvasFocus] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"tools" | "properties" | null>(
    null
  );

  const selected = useMemo(
    () => version?.fields.find((f) => f.id === selectedId) ?? null,
    [version, selectedId]
  );
  const activeTool = activeToolId ? TOOL_BY_ID[activeToolId] : null;

  if (role !== "admin") {
    return (
      <div className="p-6">
        <div className="text-sm text-neutral-500 dark:text-neutral-400">
          Worker accounts only fill ready forms. Switch to Admin to edit
          templates.
        </div>
        <div className="mt-3">
          <Button variant="secondary" onClick={() => nav("/field")}>
            Go to Field App
          </Button>
        </div>
      </div>
    );
  }

  if (!form || !version) {
    return (
      <div className="p-6">
        <div className="text-sm text-neutral-500 dark:text-neutral-400">
          Form not found.
        </div>
      </div>
    );
  }

  const pdf = version.pdf;
  const canvas = version.canvas ?? { width: 210, height: 297 };
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [allowNavigate, setAllowNavigate] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [publishReady, setPublishReady] = useState(false);
  const [publishNext, setPublishNext] = useState<string | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(form.name);
  const [renaming, setRenaming] = useState(false);
  const shouldBlock = role === "admin" && Boolean(pdf) && !allowNavigate;
  const { navigator } = useContext(UNSAFE_NavigationContext);
  const [blockedTx, setBlockedTx] = useState<{
    retry: () => void;
    location: { pathname: string; search: string };
  } | null>(null);

  useEffect(() => {
    if (!shouldBlock) return;
    const block = (navigator as any).block;
    if (typeof block !== "function") return;
    const unblock = block((tx: any) => {
      const retry = () => {
        unblock();
        tx.retry();
      };
      setBlockedTx({
        retry,
        location: { pathname: tx.location.pathname, search: tx.location.search },
      });
      setPendingPath(`${tx.location.pathname}${tx.location.search}`);
      setLeaveOpen(true);
    });
    return unblock;
  }, [navigator, shouldBlock]);

  useEffect(() => {
    if (!shouldBlock) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [shouldBlock]);

  const handleUpsertField = useCallback(
    (next: Field) => {
      void upsertField(form.id, version.id, next).catch((err) => {
        pushToast({
          title: "Field update failed",
          message: err?.message || "Unable to save field",
          variant: "danger",
        });
      });
    },
    [form.id, version.id, upsertField, pushToast]
  );

  const handleDeleteField = useCallback(
    (fieldId: string) => {
      void deleteField(form.id, version.id, fieldId).catch((err) => {
        pushToast({
          title: "Delete failed",
          message: err?.message || "Unable to delete field",
          variant: "danger",
        });
      });
    },
    [form.id, version.id, deleteField, pushToast]
  );

  const handleDuplicateField = useCallback(
    (field: Field, grid: { x: number; y: number }) => {
      const offsetX = grid.x ? grid.x * 2 : 0.02;
      const offsetY = grid.y ? grid.y * 2 : 0.02;
      const maxX = 1 - field.w;
      const maxY = 1 - field.h;
      const nextX =
        field.x + offsetX <= maxX ? field.x + offsetX : field.x - offsetX;
      const nextY =
        field.y + offsetY <= maxY ? field.y + offsetY : field.y - offsetY;
      const nx = clamp(snapToGrid(nextX, grid.x), 0, maxX);
      const ny = clamp(snapToGrid(nextY, grid.y), 0, maxY);
      const copy: Field = {
        ...field,
        id: uid("fld"),
        key: `${field.key}_${Math.random().toString(16).slice(2, 6)}`,
        x: nx,
        y: ny,
      };
      handleUpsertField(copy);
      setSelectedId(copy.id);
    },
    [handleUpsertField]
  );

  const pageList = useMemo(
    () =>
      pdf
        ? Array.from({ length: Math.max(1, numPages) }, (_, i) => i + 1)
        : [1],
    [pdf, numPages]
  );

  const handlePublishComplete = useCallback(
    async (nextPath?: string | null) => {
      try {
        await publishVersion(form.id, version.id);
        setAllowNavigate(true);
        setPublishNext(nextPath ?? null);
        setPublishReady(true);
      } catch (err: any) {
        pushToast({
          title: "Publish failed",
          message: err?.message || "Unable to publish",
          variant: "danger",
        });
      }
    },
    [form.id, publishVersion, pushToast, version.id]
  );

  const handleRename = async () => {
    const nextName = renameValue.trim();
    if (!nextName) {
      pushToast({
        title: "Name required",
        message: "Enter a form name before saving.",
        variant: "warning",
      });
      return;
    }
    if (nextName === form.name) {
      setRenameOpen(false);
      return;
    }
    setRenaming(true);
    try {
      await renameForm(form.id, nextName);
      pushToast({
        title: "Form renamed",
        message: nextName,
        variant: "success",
      });
      setRenameOpen(false);
    } catch (err: any) {
      pushToast({
        title: "Rename failed",
        message: err?.message || "Unable to rename form",
        variant: "danger",
      });
    } finally {
      setRenaming(false);
    }
  };

  useEffect(() => {
    if (!publishReady) return;
    const query = new URLSearchParams();
    query.set("v", version.id);
    if (publishNext) query.set("next", publishNext);
    nav(`/builder/complete/${form.id}?${query.toString()}`);
  }, [form.id, nav, publishNext, publishReady, version.id]);

  const toolPaletteBody = (
    <>
      <div className="text-sm font-semibold">Tool Palette</div>
      {TOOL_SECTIONS.map((section, idx) => (
        <div
          key={section.title ?? `tools-${idx}`}
          className={idx === 0 ? "mt-3" : "mt-4"}
        >
          {section.title && (
            <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {section.title}
            </div>
          )}
          <div
            className={cn(
              "grid grid-cols-2 gap-2",
              section.title ? "mt-2" : ""
            )}
          >
            {section.tools.map((t) => (
              <button
                key={t.id}
                className={cn(
                  "rf-focus rounded-2xl border px-3 py-2 text-sm font-medium",
                  activeToolId === t.id
                    ? "border-[var(--rf-accent)] bg-[var(--rf-accent)] text-[var(--rf-accent-contrast)]"
                    : "border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                )}
                draggable
                title={t.description ?? t.label}
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/x-rf-tool", t.id);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() =>
                  setActiveToolId((prev) => (prev === t.id ? null : t.id))
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-neutral-500 dark:text-neutral-400">
          Status
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
      </div>

      {!pdf && (
        <div className="mt-4">
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            Canvas size (mm)
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              className="rf-focus rounded-xl border border-neutral-200 px-2 py-1 text-xs hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
              onClick={() =>
                setCanvasSize(form.id, version.id, {
                  width: 210,
                  height: 297,
                })
              }
            >
              A4
            </button>
            <button
              className="rf-focus rounded-xl border border-neutral-200 px-2 py-1 text-xs hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
              onClick={() =>
                setCanvasSize(form.id, version.id, {
                  width: 216,
                  height: 279,
                })
              }
            >
              Letter
            </button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">
                W
              </div>
              <Input
                type="number"
                value={Math.round(canvas.width)}
                onChange={(e) =>
                  setCanvasSize(form.id, version.id, {
                    width: Math.max(50, Number(e.target.value || 0)),
                    height: canvas.height,
                  })
                }
              />
            </div>
            <div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">
                H
              </div>
              <Input
                type="number"
                value={Math.round(canvas.height)}
                onChange={(e) =>
                  setCanvasSize(form.id, version.id, {
                    width: canvas.width,
                    height: Math.max(50, Number(e.target.value || 0)),
                  })
                }
              />
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
        Tip: drag fields to reposition, triple-click to duplicate. Hand mode
        prevents accidental adds.
      </div>
    </>
  );

  const propertiesBody = (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">Field Properties</div>
        <div className="flex items-center gap-2">
          {selected && (
            <button
              className="rf-focus rounded-xl p-2 hover:bg-neutral-100 dark:hover:bg-neutral-900"
              title="Delete field"
              onClick={() => {
                handleDeleteField(selected.id);
                setSelectedId(null);
              }}
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      {!selected ? (
        <div className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
          Select a field on the canvas to edit.
        </div>
      ) : (
        <FieldEditor field={selected} onChange={handleUpsertField} />
      )}
    </>
  );

  // Builder page
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <SectionHeader
        title="Form Builder"
        subtitle={`${form.name} · ${version.version} · ${version.fieldCount} fields`}
        right={
          <>
            <Button variant="ghost" onClick={() => nav("/field")}>
              <Eye size={16} /> Preview Field App
            </Button>

            <Button
              variant="secondary"
              onClick={() => {
                setRenameValue(form.name);
                setRenameOpen(true);
              }}>
              <Pencil size={16} /> Rename
            </Button>

            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (apiEnabled) {
                  void uploadPdf(form.id, version.id, file)
                    .then(() =>
                      pushToast({
                        title: "PDF uploaded",
                        message: file.name,
                        variant: "success",
                      })
                    )
                    .catch((err) =>
                      pushToast({
                        title: "Upload failed",
                        message: err?.message || "Unable to upload PDF",
                        variant: "danger",
                      })
                    );
                } else {
                  const reader = new FileReader();
                  reader.onload = () => {
                    const dataUrl = String(reader.result);
                    setPdf(form.id, version.id, {
                      name: file.name,
                      mime: file.type || "application/pdf",
                      dataUrl,
                    });
                    useAppStore.getState().pushToast({
                      title: "PDF uploaded",
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
              onClick={() => pdfInputRef.current?.click()}>
              <Upload size={16} /> {pdf ? "Replace PDF" : "Upload PDF"}
            </Button>

            <Button
              onClick={async () => {
                await handlePublishComplete(null);
              }}
              disabled={version.status === "active"}>
              <CheckCircle2 size={16} /> Publish
            </Button>
          </>
        }
      />

      <div
        className={cn(
          "flex-1 min-h-0 px-4 pt-4 pb-6 sm:px-6 sm:pt-6 grid gap-4 items-stretch",
          "grid-cols-1 xl:grid-cols-[260px_1fr_320px]"
        )}>
        {/* Tool Palette */}
        <Card className="sticky top-6 self-start">
          <CardBody>
            <div className="text-sm font-semibold">Tool Palette</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Click a tool (or drag it) onto the canvas. Click it again for Hand mode.
            </div>
            {TOOL_SECTIONS.map((section, idx) => (
              <div key={section.title ?? `tools-${idx}`} className={idx === 0 ? 'mt-3' : 'mt-4'}>
                {section.title && (
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    {section.title}
                  </div>
                )}
                <div className={cn('grid grid-cols-2 gap-2', section.title ? 'mt-2' : '')}>
                  {section.tools.map((t) => (
                    <button
                      key={t.id}
                      className={cn(
                        'rf-focus rounded-2xl border px-3 py-2 text-sm font-medium transition',
                        activeToolId === t.id
                          ? 'border-[var(--rf-accent)] bg-[var(--rf-accent)] text-[var(--rf-accent-contrast)]'
                          : 'border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900'
                      )}
                      draggable
                      title={t.description ?? t.label}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/x-rf-tool', t.id)
                        e.dataTransfer.effectAllowed = 'copy'
                      }}
                      onClick={() => setActiveToolId((prev) => (prev === t.id ? null : t.id))}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              ))}

            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-neutral-500 dark:text-neutral-400">Status</div>
              <Badge tone={version.status === 'active' ? 'success' : version.status === 'draft' ? 'warning' : 'neutral'}>{version.status}</Badge>
            </div>
        {!canvasFocus && (
          <div className="hidden xl:block h-full min-h-0">
            <Card className="h-full min-h-0">
              <CardBody className="h-full min-h-0 overflow-auto rf-scrollbar pt-5 sm:pt-6">
                {toolPaletteBody}
              </CardBody>
            </Card>
          </div>
        )}

        {/* Canvas */}
        <div className="flex flex-col min-h-0">
          <Card className="flex flex-col min-h-0 h-full">
            <CardBody className="flex flex-col min-h-0 h-full pt-5 sm:pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
                <div className="text-sm font-semibold">PDF Canvas</div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">
                    {numPages > 1 ? `${numPages} pages` : "Single page"}
                  </div>
                  <div className="flex items-center gap-2 xl:hidden">
                    {!canvasFocus && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setMobilePanel("tools")}
                      >
                        Tools
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setMobilePanel("properties")}
                    >
                      Properties
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
              Tip: drag fields to reposition, triple-click to duplicate. Hand mode prevents accidental adds.
            </div>
          </CardBody>
        </Card>
        )}

              <div className="mt-3 space-y-6 overflow-y-auto flex-1 min-h-0 rf-scrollbar">
                {pageList.map((pageIndex) => (
                  <PageCanvas
                    key={pageIndex}
                    pageIndex={pageIndex}
                    pageCount={pageList.length}
                    pdf={pdf}
                    canvas={canvas}
                    fields={version.fields}
                    activeTool={activeTool}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onUpsert={handleUpsertField}
                    onDuplicate={handleDuplicateField}
                    onDelete={handleDeleteField}
                    onMeta={
                      pageIndex === 1
                        ? (m) => setNumPages(m.numPages)
                        : undefined
                    }
                  />
                ))}
              </div>

              <div className="mt-3 text-xs text-neutral-500 dark:text-neutral-400 flex justify-between gap-3 flex-shrink-0">
                <div>
                  {activeTool ? (
                    <>
                      Click on canvas to add:{" "}
                      <span className="font-medium">{activeTool.label}</span>
                    </>
                  ) : (
                    <span>Hand mode: click fields to select or drag</span>
                  )}
                </div>
                <div>{pdf ? pdf.name : "No PDF"}</div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Properties */}
        <div className="hidden xl:block h-full min-h-0">
          <Card className="h-full min-h-0">
            <CardBody className="h-full min-h-0 overflow-auto rf-scrollbar pt-5 sm:pt-6">
              {propertiesBody}
            </CardBody>
          </Card>
        </div>
      </div>

      <Modal
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        title="Rename form"
      >
        <div className="space-y-3">
          <div className="text-sm text-neutral-500">
            Update the template name for this form.
          </div>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleRename();
              }
            }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button disabled={renaming} onClick={() => void handleRename()}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={mobilePanel === "tools"}
        onClose={() => setMobilePanel(null)}
        title="Tool Palette"
      >
        <div className="max-h-[70vh] overflow-y-auto">{toolPaletteBody}</div>
      </Modal>

      <Modal
        open={mobilePanel === "properties"}
        onClose={() => setMobilePanel(null)}
        title="Field Properties"
      >
        <div className="max-h-[70vh] overflow-y-auto">{propertiesBody}</div>
      </Modal>

      <Modal
        open={leaveOpen}
        onClose={() => {
          setLeaveOpen(false);
          setBlockedTx(null);
          setPendingPath(null);
        }}
        title="Leave builder?"
      >
        <div className="space-y-4">
          <div className="text-sm text-neutral-600">
            This form has a PDF attached. Choose what you want to do before
            leaving the builder.
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setLeaveOpen(false);
                setBlockedTx(null);
                setPendingPath(null);
              }}
            >
              Keep editing
            </Button>
            {!apiEnabled && (
              <Button
                variant="secondary"
                onClick={() => {
                  setPdf(form.id, version.id, undefined);
                  setLeaveOpen(false);
                  blockedTx?.retry();
                  setBlockedTx(null);
                  setPendingPath(null);
                }}
              >
                Remove PDF & leave
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => {
                setLeaveOpen(false);
                blockedTx?.retry();
                setBlockedTx(null);
                setPendingPath(null);
              }}
            >
              Save draft & leave
            </Button>
            <Button
              onClick={async () => {
                setBlockedTx(null);
                setLeaveOpen(false);
                await handlePublishComplete(pendingPath);
                setPendingPath(null);
              }}
              disabled={version.status === "active"}
            >
              Publish & continue
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PageCanvas({
  pageIndex,
  pageCount,
  pdf,
  canvas,
  fields,
  activeTool,
  selectedId,
  onSelect,
  onUpsert,
  onDuplicate,
  onDelete,
  onMeta,
}: {
  pageIndex: number;
  pageCount: number;
  pdf?: { dataUrl?: string; url?: string };
  canvas: { width: number; height: number };
  fields: Field[];
  activeTool: ToolPreset | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpsert: (f: Field) => void;
  onDuplicate: (field: Field, grid: { x: number; y: number }) => void;
  onDelete: (fieldId: string) => void;
  onMeta?: (meta: { numPages: number }) => void;
}) {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const stageWidthKey = Math.round(size.width);
  const grid = getGridStep(size);
  const fieldsOnPage = useMemo(
    () => fields.filter((f) => f.page === pageIndex),
    [fields, pageIndex]
  );
  const hasPdf = Boolean(pdf?.dataUrl || pdf?.url);

  return (
    <div className="space-y-2">
      {pageCount > 1 && (
        <div className="text-xs text-neutral-500 dark:text-neutral-400">
          Page {pageIndex}
        </div>
      )}
      <div className="relative" ref={ref}>
        {hasPdf ? (
          <PdfPageCanvas
            dataUrl={pdf?.dataUrl ?? pdf?.url}
            page={pageIndex}
            refreshKey={stageWidthKey}
            onMeta={onMeta}
            className="min-h-[260px]"
          />
        ) : (
          <div
            className="w-full rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-white/70 dark:bg-neutral-950/40 flex items-center justify-center p-6 text-center"
            style={{ aspectRatio: `${canvas.width} / ${canvas.height}` }}>
            <div className="pointer-events-none">
              <div className="text-sm font-medium">
                Upload a PDF to lock the layout
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                You can still place fields on this blank page.
              </div>
            </div>
          </div>
        )}

        <div
          className={cn(
            "absolute inset-0",
            activeTool ? "cursor-crosshair" : "cursor-grab"
          )}
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).dataset.field === "1") return;
            if (!activeTool) {
              onSelect(null);
              return;
            }
            const rect = (
              e.currentTarget as HTMLDivElement
            ).getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            const f = newField(activeTool, x, y, pageIndex, grid);
            onUpsert(f);
            onSelect(f.id);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const toolId = e.dataTransfer.getData("application/x-rf-tool");
            const tool = TOOL_BY_ID[toolId];
            if (!tool) return;
            const rect = (
              e.currentTarget as HTMLDivElement
            ).getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            const f = newField(tool, x, y, pageIndex, grid);
            onUpsert(f);
            onSelect(f.id);
          }}>
          {fieldsOnPage.map((f) => (
            <FieldBox
              key={f.id}
              field={f}
              selected={f.id === selectedId}
              stage={size}
              onSelect={() => onSelect(f.id)}
              onMove={(nx, ny) => onUpsert({ ...f, x: nx, y: ny })}
              onResize={(nw, nh) => onUpsert({ ...f, w: nw, h: nh })}
              onDuplicate={() => onDuplicate(f, grid)}
              onDelete={() => {
                onDelete(f.id);
                if (selectedId === f.id) onSelect(null);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
const FieldEditor = React.memo(function FieldEditor({
  field,
  onChange,
}: {
  field: Field;
  onChange: (f: Field) => void | Promise<void>;
}) {
  const {
    maxW,
    maxH,
    fontSize,
    supportsFontSize,
    supportsOptions,
    supportsAutoValue,
    supportsMaxLength,
    suggestedLength,
    optionText,
  } = useMemo(() => {
    const maxW = Math.max(1 - field.x, MIN_FIELD_SIZE);
    const maxH = Math.max(1 - field.y, MIN_FIELD_SIZE);
    const fontSize = field.fontSize ?? DEFAULT_FONT_SIZE;
    const type = field.type;
    const supportsFontSize =
      type === "text" ||
      type === "numeric" ||
      type === "date" ||
      type === "employee" ||
      type === "select" ||
      type === "radio";
    const supportsOptions = type === "select" || type === "radio";
    const supportsAutoValue = type === "text" || type === "date";
    const supportsMaxLength = supportsFieldMaxLength(field);
    const suggestedLength = supportsMaxLength
      ? suggestedMaxLength(field)
      : undefined;
    const optionText = supportsOptions ? (field.options ?? []).join("\n") : "";
    return {
      maxW,
      maxH,
      fontSize,
      supportsFontSize,
      supportsOptions,
      supportsAutoValue,
      supportsMaxLength,
      suggestedLength,
      optionText,
    };
  }, [field]);

  return (
    <div className="mt-4 space-y-4">
      <div className="space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Basics
        </div>
        <div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
            Label
          </div>
          <Input
            value={field.label}
            onChange={(e) => onChange({ ...field, label: e.target.value })}
          />
        </div>

        <div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
            Field Key
          </div>
          <Input
            value={field.key}
            onChange={(e) =>
              onChange({ ...field, key: e.target.value.replace(/\s+/g, "_") })
            }
          />
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
            Used in storage/export.
          </div>
        </div>

        <div className="hidden">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
            Type
          </div>
          <Select
            value={field.type}
            disabled
            title="Field type is locked after placement">
            <option value="text">Text</option>
            <option value="numeric">Numeric</option>
            <option value="checkbox">Checkbox</option>
            <option value="date">Date</option>
            <option value="signature">Signature</option>
            <option value="photo">Photo</option>
            <option value="employee">Employee list</option>
            <option value="select">List (dropdown)</option>
            <option value="radio">Radio buttons</option>
          </Select>
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
            Type is locked once placed on the canvas.
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            Required
          </div>
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={field.required}
            onChange={(e) => onChange({ ...field, required: e.target.checked })}
          />
        </div>

        {supportsAutoValue && (
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              Auto-fill
            </div>
            <Select
              value={field.autoValue ?? "none"}
              onChange={(e) => {
                const next = e.target.value as Field["autoValue"] | "none";
                if (next === "none") {
                  onChange({ ...field, autoValue: undefined, readOnly: false });
                  return;
                }
                onChange({
                  ...field,
                  autoValue: next,
                  readOnly: field.readOnly ?? true,
                });
              }}>
              <option value="none">None</option>
              {field.type === "date" && (
                <option value="today">Current date</option>
              )}
              {field.type === "text" && (
                <option value="creator">Creator (assigned to)</option>
              )}
            </Select>
          </div>
        )}

        {field.autoValue && (
          <div className="flex items-center justify-between">
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              Read-only
            </div>
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={field.readOnly ?? false}
              onChange={(e) =>
                onChange({ ...field, readOnly: e.target.checked })
              }
            />
          </div>
        )}
      </div>

      {supportsMaxLength && (
        <div className="space-y-3 border-t border-neutral-200/80 pt-4 dark:border-neutral-800/80">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Limits
          </div>
          <div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                Max characters
              </div>
              {field.maxLength ? (
                <button
                  type="button"
                  className="rf-focus text-[11px] text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
                  onClick={() => onChange({ ...field, maxLength: undefined })}>
                  Use auto
                </button>
              ) : null}
            </div>
            <Input
              type="number"
              min={1}
              placeholder={suggestedLength ? String(suggestedLength) : ""}
              value={field.maxLength ?? ""}
              onChange={(e) => {
                const raw = e.target.value;
                if (!raw) {
                  onChange({ ...field, maxLength: undefined });
                  return;
                }
                const parsed = Math.max(1, Math.round(Number(raw)));
                onChange({
                  ...field,
                  maxLength: Number.isFinite(parsed) ? parsed : undefined,
                });
              }}
            />
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
              {field.maxLength
                ? "Custom limit set."
                : suggestedLength
                ? `Auto: ${suggestedLength} based on size.`
                : "Auto limit based on size."}
            </div>
          </div>
        </div>
      )}

      {supportsOptions && (
        <div className="space-y-3 border-t border-neutral-200/80 pt-4 dark:border-neutral-800/80">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Options
          </div>
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              List items
            </div>
            <Textarea
              value={optionText}
              placeholder="One option per line"
              onChange={(e) => {
                const nextOptions =
                  normalizeOptionList(e.target.value.split("\n")) ?? [];
                onChange({ ...field, options: nextOptions });
              }}
            />
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
              One option per line. Empty lines are ignored.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rf-focus rounded-xl border border-neutral-200 px-2 py-1 text-xs hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
              onClick={() => onChange({ ...field, options: ["Yes", "No"] })}>
              Yes / No
            </button>
            <button
              type="button"
              className="rf-focus rounded-xl border border-neutral-200 px-2 py-1 text-xs hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
              onClick={() =>
                onChange({ ...field, options: ["Yes", "No", "NA"] })
              }>
              Yes / No / NA
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3 border-t border-neutral-200/80 pt-4 dark:border-neutral-800/80">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Guidance
        </div>
        <div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
            Hint
          </div>
          <Input
            value={field.hint ?? ""}
            onChange={(e) => onChange({ ...field, hint: e.target.value })}
          />
        </div>

        <div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
            Help Text
          </div>
          <Textarea
            value={field.helpText ?? ""}
            onChange={(e) => onChange({ ...field, helpText: e.target.value })}
          />
        </div>
      </div>

      {supportsFontSize && (
        <div className="space-y-3 border-t border-neutral-200/80 pt-4 dark:border-neutral-800/80">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Typography
          </div>
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              Font size (px)
            </div>
            <Input
              type="number"
              min={8}
              max={36}
              value={fontSize}
              onChange={(e) => {
                const next = Number(e.target.value || DEFAULT_FONT_SIZE);
                onChange({
                  ...field,
                  fontSize: Math.min(36, Math.max(8, next)),
                });
              }}
            />
          </div>
        </div>
      )}

      {field.type !== "checkbox" && (
        <div className="space-y-3 border-t border-neutral-200/80 pt-4 dark:border-neutral-800/80">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Size
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                W
              </div>
              <Input
                type="number"
                value={Math.round(field.w * 100)}
                onChange={(e) =>
                  onChange({
                    ...field,
                    w: clamp(
                      Number(e.target.value) / 100,
                      MIN_FIELD_SIZE,
                      maxW
                    ),
                  })
                }
              />
            </div>
            <div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                H
              </div>
              <Input
                type="number"
                value={Math.round(field.h * 100)}
                onChange={(e) =>
                  onChange({
                    ...field,
                    h: clamp(
                      Number(e.target.value) / 100,
                      MIN_FIELD_SIZE,
                      maxH
                    ),
                  })
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

const FieldBox = React.memo(function FieldBox({
  field,
  selected,
  stage,
  onSelect,
  onMove,
  onResize,
  onDuplicate,
  onDelete,
}: {
  field: Field;
  selected: boolean;
  stage: { width: number; height: number };
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (w: number, h: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [drag, setDrag] = useState<null | {
    ox: number;
    oy: number;
    pid: number;
  }>(null);
  const [resize, setResize] = useState<null | {
    startX: number;
    startY: number;
    w: number;
    h: number;
    pid: number;
  }>(null);
  const grid = useMemo(() => getGridStep(stage), [stage.width, stage.height]);
  const style = useMemo(
    () =>
      ({
        left: `${field.x * 100}%`,
        top: `${field.y * 100}%`,
        width: `${field.w * 100}%`,
        height: `${field.h * 100}%`,
        touchAction: "none",
      } as const),
    [field.x, field.y, field.w, field.h]
  );
  const canResize = field.type !== "checkbox";

  return (
    <div
      data-field="1"
      className={cn(
        "group absolute rounded-xl border text-[11px] flex items-center justify-center select-none cursor-move",
        selected
          ? "border-blue-500 bg-blue-50 text-blue-900 shadow-sm dark:border-blue-300 dark:bg-blue-100 dark:text-blue-950"
          : "border-neutral-300 bg-white/80 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-100"
      )}
      style={style}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        const rect = (
          e.currentTarget as HTMLDivElement
        ).getBoundingClientRect();
        setDrag({
          ox: e.clientX - rect.left,
          oy: e.clientY - rect.top,
          pid: e.pointerId,
        });
      }}
      onPointerMove={(e) => {
        if (resize && resize.pid === e.pointerId) {
          e.stopPropagation();
          const parent = (
            e.currentTarget.parentElement as HTMLDivElement
          ).getBoundingClientRect();
          const dx = (e.clientX - resize.startX) / parent.width;
          const dy = (e.clientY - resize.startY) / parent.height;
          const maxW = 1 - field.x;
          const maxH = 1 - field.y;
          const nextW = clamp(
            snapToGrid(resize.w + dx, grid.x),
            MIN_FIELD_SIZE,
            maxW
          );
          const nextH = clamp(
            snapToGrid(resize.h + dy, grid.y),
            MIN_FIELD_SIZE,
            maxH
          );
          onResize(nextW, nextH);
          return;
        }
        if (!drag || drag.pid !== e.pointerId) return;
        e.stopPropagation();
        const parent = (
          e.currentTarget.parentElement as HTMLDivElement
        ).getBoundingClientRect();
        const nx = (e.clientX - parent.left - drag.ox) / parent.width;
        const ny = (e.clientY - parent.top - drag.oy) / parent.height;
        const maxX = 1 - field.w;
        const maxY = 1 - field.h;
        onMove(
          clamp(snapToGrid(nx, grid.x), 0, maxX),
          clamp(snapToGrid(ny, grid.y), 0, maxY)
        );
      }}
      onPointerUp={(e) => {
        if (drag?.pid === e.pointerId || resize?.pid === e.pointerId) {
          e.stopPropagation();
          setDrag(null);
          setResize(null);
        }
      }}
      onPointerCancel={() => {
        setDrag(null);
        setResize(null);
      }}
      onClick={(e) => {
        if (e.detail !== 3) return;
        e.stopPropagation();
        onDuplicate();
      }}>
      <span className="px-2 truncate">{field.label}</span>
      <button
        type="button"
        className={cn(
          "rf-focus absolute -right-2 -top-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white shadow-sm",
          selected
            ? "bg-blue-500 text-white"
            : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800",
          selected
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
        )}
        title="Delete field"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}>
        <Trash2 size={12} />
      </button>
      {canResize && (
        <div
          className={cn(
            "absolute -right-1 -bottom-1 h-3 w-3 rounded-full border border-white shadow-sm cursor-se-resize",
            selected ? "bg-blue-500" : "bg-neutral-400"
          )}
          onPointerDown={(e) => {
            e.stopPropagation();
            onSelect();
            const box = e.currentTarget.parentElement as HTMLDivElement;
            box.setPointerCapture(e.pointerId);
            setResize({
              startX: e.clientX,
              startY: e.clientY,
              w: field.w,
              h: field.h,
              pid: e.pointerId,
            });
          }}
        />
      )}
    </div>
  );
});

function newField(
  tool: ToolPreset,
  x: number,
  y: number,
  page: number,
  grid?: { x: number; y: number }
): Field {
  const sizes: Record<FieldType, { w: number; h: number }> = {
    text: { w: 0.34, h: 0.055 },
    numeric: { w: 0.26, h: 0.055 },
    checkbox: { w: 0.18, h: 0.055 },
    date: { w: 0.24, h: 0.055 },
    signature: { w: 0.5, h: 0.11 },
    photo: { w: 0.5, h: 0.09 },
    employee: { w: 0.4, h: 0.055 },
    select: { w: 0.34, h: 0.055 },
    radio: { w: 0.34, h: 0.11 },
  };

  const type = tool.type
  const wh = sizes[type]
  const maxX = 1 - wh.w
  const maxY = 1 - wh.h
  const nx = clamp(snapToGrid(x, grid?.x ?? 0), 0, maxX)
  const ny = clamp(snapToGrid(y, grid?.y ?? 0), 0, maxY)
  const label = tool.label || labelFor(type)
  const keyBase = slugifyKey(tool.keyBase ?? (label || type || 'field'))
  const options = normalizeOptionList(tool.options)
  const type = tool.type;
  const wh = sizes[type];
  const maxX = 1 - wh.w;
  const maxY = 1 - wh.h;
  const nx = clamp(snapToGrid(x, grid?.x ?? 0), 0, maxX);
  const ny = clamp(snapToGrid(y, grid?.y ?? 0), 0, maxY);
  const label = tool.label || labelFor(type);
  const keyBase = slugifyKey((tool.keyBase ?? label) || type || "field");
  const options = normalizeOptionList(tool.options);
  return {
    id: uid("fld"),
    type,
    label,
    key: `${keyBase}_${Math.random().toString(16).slice(2, 6)}`,
    required: tool.required ?? false,
    validation:
      tool.validation ??
      (type === "numeric"
        ? { kind: "range", min: 0, max: 300 }
        : { kind: "none" }),
    fontSize: DEFAULT_FONT_SIZE,
    options:
      options ??
      (type === "select" || type === "radio"
        ? ["Option 1", "Option 2"]
        : undefined),
    autoValue: tool.autoValue,
    readOnly: tool.readOnly,
    hint: tool.hint,
    helpText: tool.helpText,
    x: nx,
    y: ny,
    page,
    w: wh.w,
    h: wh.h,
  };
}

function labelFor(type: FieldType) {
  switch (type) {
    case "text":
      return "Text";
    case "numeric":
      return "Numeric";
    case "checkbox":
      return "Checkbox";
    case "date":
      return "Date";
    case "signature":
      return "Signature";
    case "photo":
      return "Photo";
    case "employee":
      return "Employees";
    case "select":
      return "List";
    case "radio":
      return "Radio Buttons";
  }
}

function slugifyKey(value: string) {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || "field";
}

function normalizeOptionList(options?: string[]) {
  if (!options) return undefined;
  const trimmed = options.map((opt) => opt.trim()).filter(Boolean);
  if (trimmed.length === 0) return undefined;
  return Array.from(new Set(trimmed));
}

function getGridStep(stage: { width: number; height: number }) {
  const x = stage.width ? GRID_PX / stage.width : 0;
  const y = stage.height ? GRID_PX / stage.height : 0;
  return { x: Math.min(x, 1), y: Math.min(y, 1) };
}

function snapToGrid(value: number, step: number) {
  if (!step) return value;
  return Math.round(value / step) * step;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
