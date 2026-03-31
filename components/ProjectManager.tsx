"use client";

import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { Bounce, ToastContainer, toast } from "react-toastify";
import { Button } from "@nextui-org/button";

import "react-toastify/dist/ReactToastify.css";
import {
  APP_STORAGE_KEYS,
  getStoredValue,
  migrateLegacyLocalStorageData,
  setStoredValue,
} from "@/lib/app-storage";

type PicAssignment = { id: string; person: string; feature: string };

type ProjectSnapshot = {
  name: string;
  nearestTarget: string;
  todayWork: string;
  picAssignments: PicAssignment[];
  blockers: string;
  progress: string;
  notes: string;
};

type ProjectRecord = ProjectSnapshot & { id: string; updatedAt: string };

type TemplateRecord = Omit<ProjectSnapshot, "name"> & {
  id: string;
  name: string;
  createdAt: string;
};

type ReportHistoryRecord = {
  id: string;
  projectId: string;
  projectName: string;
  report: string;
  createdAt: string;
  snapshot: ProjectSnapshot;
};

const PROJECT_STORAGE_KEY = APP_STORAGE_KEYS.projectManagerProjects;
const TEMPLATE_STORAGE_KEY = APP_STORAGE_KEYS.projectManagerTemplates;
const HISTORY_STORAGE_KEY = APP_STORAGE_KEYS.projectManagerHistory;

const toastOptions = {
  autoClose: 2600,
  closeOnClick: true,
  draggable: true,
  pauseOnHover: true,
  position: "bottom-right" as const,
  theme: "colored" as const,
  transition: Bounce,
};

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const todayDateString = () => new Date().toISOString().slice(0, 10);

const createEmptyPicAssignment = (): PicAssignment => ({
  id: createId(),
  person: "",
  feature: "",
});

const getMeaningfulPicAssignments = (assignments: PicAssignment[]) =>
  assignments.filter(
    (assignment) =>
      assignment.person.trim().length > 0 || assignment.feature.trim().length > 0
  );

const clonePicAssignments = (assignments: PicAssignment[]) => {
  const meaningfulAssignments = getMeaningfulPicAssignments(assignments);

  if (!meaningfulAssignments.length) {
    return [createEmptyPicAssignment()];
  }

  return meaningfulAssignments.map((assignment) => ({
    id: createId(),
    person: assignment.person,
    feature: assignment.feature,
  }));
};

const createEmptySnapshot = (name = ""): ProjectSnapshot => ({
  name,
  nearestTarget: "",
  todayWork: "",
  picAssignments: [createEmptyPicAssignment()],
  blockers: "",
  progress: "",
  notes: "",
});

const createEmptyProject = (name: string): ProjectRecord => ({
  id: createId(),
  ...createEmptySnapshot(name),
  updatedAt: new Date().toISOString(),
});

const defaultTemplate = (): TemplateRecord => ({
  id: "default-report-template",
  name: "Laporan Harian Default",
  nearestTarget: "",
  todayWork: "",
  picAssignments: [createEmptyPicAssignment()],
  blockers: "",
  progress: "",
  notes: "",
  createdAt: new Date().toISOString(),
});

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const formatReportDate = (value: string) => {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
};

const parsePicAssignmentsFromString = (value: string) => {
  const rawLines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!rawLines.length) {
    return [createEmptyPicAssignment()];
  }

  return rawLines.map((line) => {
    const separator = line.includes("→") ? "→" : line.includes("->") ? "->" : "";

    if (!separator) {
      return { id: createId(), person: line, feature: "" };
    }

    const [person, ...featureParts] = line.split(separator);

    return {
      id: createId(),
      person: person.trim(),
      feature: featureParts.join(separator).trim(),
    };
  });
};

const formatPicAssignments = (assignments: PicAssignment[]) =>
  getMeaningfulPicAssignments(assignments)
    .map((assignment) =>
      assignment.person.trim() && assignment.feature.trim()
        ? `${assignment.person.trim()} → ${assignment.feature.trim()}`
        : assignment.person.trim() || assignment.feature.trim()
    )
    .join("\n");

const buildReport = (snapshot: ProjectSnapshot, date: string) =>
  [
    "\uD83D\uDCCA LAPORAN HARIAN PROYEK",
    `\uD83D\uDCC5 Tanggal: ${formatReportDate(date)}`,
    "",
    "\uD83D\uDCCC Nama Proyek:",
    snapshot.name,
    "",
    "\uD83C\uDFAF Target Terdekat:",
    snapshot.nearestTarget,
    "",
    "\uD83D\uDEE0 Pekerjaan Hari Ini:",
    snapshot.todayWork,
    "",
    "\uD83D\uDC65 PIC (Penanggung Jawab):",
    formatPicAssignments(snapshot.picAssignments),
    "",
    "\u26A0\uFE0F Kendala:",
    snapshot.blockers,
    "",
    "\uD83D\uDCC8 Progress:",
    snapshot.progress,
    "",
    "\uD83D\uDCDD Catatan Tambahan:",
    snapshot.notes,
  ].join("\n");

const parseReportToSnapshot = (report: string, fallbackName: string): ProjectSnapshot => {
  const sections = {
    name: [] as string[],
    nearestTarget: [] as string[],
    todayWork: [] as string[],
    picAssignments: [] as string[],
    blockers: [] as string[],
    progress: [] as string[],
    notes: [] as string[],
  };

  let currentSection: keyof typeof sections | null = null;

  report.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();

    if (trimmed.includes("Nama Proyek")) currentSection = "name";
    else if (trimmed.includes("Target Terdekat")) currentSection = "nearestTarget";
    else if (trimmed.includes("Pekerjaan Hari Ini")) currentSection = "todayWork";
    else if (trimmed.includes("PIC (Penanggung Jawab)")) currentSection = "picAssignments";
    else if (trimmed.includes("Kendala")) currentSection = "blockers";
    else if (trimmed.includes("Progress")) currentSection = "progress";
    else if (trimmed.includes("Catatan Tambahan")) currentSection = "notes";
    else if (trimmed.includes("Tanggal:")) currentSection = null;
    else if (currentSection) sections[currentSection].push(line);
  });

  return {
    name: sections.name.join("\n").trim() || fallbackName,
    nearestTarget: sections.nearestTarget.join("\n").trim(),
    todayWork: sections.todayWork.join("\n").trim(),
    picAssignments: parsePicAssignmentsFromString(
      sections.picAssignments.join("\n").trim()
    ),
    blockers: sections.blockers.join("\n").trim(),
    progress: sections.progress.join("\n").trim(),
    notes: sections.notes.join("\n").trim(),
  };
};

const migrateProjectRecord = (raw: any): ProjectRecord => ({
  id: typeof raw?.id === "string" ? raw.id : createId(),
  name: typeof raw?.name === "string" ? raw.name : "",
  nearestTarget: typeof raw?.nearestTarget === "string" ? raw.nearestTarget : "",
  todayWork: typeof raw?.todayWork === "string" ? raw.todayWork : "",
  picAssignments: Array.isArray(raw?.picAssignments)
    ? clonePicAssignments(
        raw.picAssignments.map((assignment: any) => ({
          id: typeof assignment?.id === "string" ? assignment.id : createId(),
          person: typeof assignment?.person === "string" ? assignment.person : "",
          feature: typeof assignment?.feature === "string" ? assignment.feature : "",
        }))
      )
    : parsePicAssignmentsFromString(typeof raw?.pic === "string" ? raw.pic : ""),
  blockers: typeof raw?.blockers === "string" ? raw.blockers : "",
  progress: typeof raw?.progress === "string" ? raw.progress : "",
  notes: typeof raw?.notes === "string" ? raw.notes : "",
  updatedAt:
    typeof raw?.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
});

const migrateTemplateRecord = (raw: any): TemplateRecord => ({
  id: typeof raw?.id === "string" ? raw.id : createId(),
  name: typeof raw?.name === "string" ? raw.name : "Template",
  nearestTarget: typeof raw?.nearestTarget === "string" ? raw.nearestTarget : "",
  todayWork: typeof raw?.todayWork === "string" ? raw.todayWork : "",
  picAssignments: Array.isArray(raw?.picAssignments)
    ? clonePicAssignments(
        raw.picAssignments.map((assignment: any) => ({
          id: typeof assignment?.id === "string" ? assignment.id : createId(),
          person: typeof assignment?.person === "string" ? assignment.person : "",
          feature: typeof assignment?.feature === "string" ? assignment.feature : "",
        }))
      )
    : parsePicAssignmentsFromString(typeof raw?.pic === "string" ? raw.pic : ""),
  blockers: typeof raw?.blockers === "string" ? raw.blockers : "",
  progress: typeof raw?.progress === "string" ? raw.progress : "",
  notes: typeof raw?.notes === "string" ? raw.notes : "",
  createdAt:
    typeof raw?.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
});

const snapshotFromProject = (project: ProjectRecord): ProjectSnapshot => ({
  name: project.name,
  nearestTarget: project.nearestTarget,
  todayWork: project.todayWork,
  picAssignments: clonePicAssignments(project.picAssignments),
  blockers: project.blockers,
  progress: project.progress,
  notes: project.notes,
});

const migrateHistoryRecord = (raw: any): ReportHistoryRecord => {
  const fallbackName = typeof raw?.projectName === "string" ? raw.projectName : "";
  const report = typeof raw?.report === "string" ? raw.report : "";
  const snapshot = raw?.snapshot
    ? snapshotFromProject(
        migrateProjectRecord({ ...(raw.snapshot as ProjectSnapshot), id: "snapshot" })
      )
    : parseReportToSnapshot(report, fallbackName);

  return {
    id: typeof raw?.id === "string" ? raw.id : createId(),
    projectId: typeof raw?.projectId === "string" ? raw.projectId : "",
    projectName: snapshot.name || fallbackName,
    report: report || buildReport(snapshot, todayDateString()),
    createdAt:
      typeof raw?.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
    snapshot,
  };
};

export default function ProjectManager() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [history, setHistory] = useState<ReportHistoryRecord[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [historyPreviewId, setHistoryPreviewId] = useState<string | null>(null);
  const [reportDate, setReportDate] = useState(todayDateString());
  const [isLoaded, setIsLoaded] = useState(false);

  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? null;
  const filteredHistory = useMemo(
    () =>
      history
        .filter((entry) => entry.projectId === selectedProjectId)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    [history, selectedProjectId]
  );
  const previewHistoryItem =
    filteredHistory.find((entry) => entry.id === historyPreviewId) ?? null;
  const reportPreview = selectedProject
    ? buildReport(snapshotFromProject(selectedProject), reportDate)
    : "";

  useEffect(() => {
    const loadStoredData = async () => {
      await migrateLegacyLocalStorageData();

      try {
        const [storedProjects, storedTemplates, storedHistory] = await Promise.all([
          getStoredValue<unknown[]>(PROJECT_STORAGE_KEY),
          getStoredValue<unknown[]>(TEMPLATE_STORAGE_KEY),
          getStoredValue<unknown[]>(HISTORY_STORAGE_KEY),
        ]);

        if (storedProjects) {
          setProjects(storedProjects.map(migrateProjectRecord));
        }

        if (storedTemplates) {
          const nextTemplates = storedTemplates.map(migrateTemplateRecord);
          setTemplates(nextTemplates.length ? nextTemplates : [defaultTemplate()]);
        } else {
          setTemplates([defaultTemplate()]);
        }

        if (storedHistory) {
          setHistory(storedHistory.map(migrateHistoryRecord));
        }
      } catch (error) {
        console.error("Failed to load project manager data:", error);
        setTemplates([defaultTemplate()]);
      }

      setIsLoaded(true);
    };

    void loadStoredData();
  }, []);

  useEffect(() => {
    if (!selectedProjectId && projects.length) {
      setSelectedProjectId(projects[0].id);
      return;
    }

    if (selectedProjectId && !projects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(projects[0]?.id ?? null);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!filteredHistory.length) {
      setHistoryPreviewId(null);
      return;
    }

    if (!historyPreviewId || !filteredHistory.some((entry) => entry.id === historyPreviewId)) {
      setHistoryPreviewId(filteredHistory[0].id);
    }
  }, [filteredHistory, historyPreviewId]);

  useEffect(() => {
    if (!isLoaded) return;
    void setStoredValue(PROJECT_STORAGE_KEY, projects);
  }, [isLoaded, projects]);

  useEffect(() => {
    if (!isLoaded) return;
    void setStoredValue(TEMPLATE_STORAGE_KEY, templates);
  }, [isLoaded, templates]);

  useEffect(() => {
    if (!isLoaded) return;
    void setStoredValue(HISTORY_STORAGE_KEY, history);
  }, [isLoaded, history]);

  const notifySuccess = (message: string) => toast.success(message, toastOptions);
  const notifyError = (message: string) => toast.error(message, toastOptions);

  const patchSelectedProject = (updater: (project: ProjectRecord) => ProjectRecord) => {
    if (!selectedProjectId) return;
    setProjects((prevProjects) =>
      prevProjects.map((project) =>
        project.id === selectedProjectId
          ? { ...updater(project), updatedAt: new Date().toISOString() }
          : project
      )
    );
  };

  const updateSelectedProjectField = (
    field: keyof Omit<ProjectSnapshot, "picAssignments">,
    value: string
  ) => {
    patchSelectedProject((project) => ({ ...project, [field]: value }));
  };

  const updatePicAssignment = (
    assignmentId: string,
    field: keyof Omit<PicAssignment, "id">,
    value: string
  ) => {
    patchSelectedProject((project) => ({
      ...project,
      picAssignments: project.picAssignments.map((assignment) =>
        assignment.id === assignmentId
          ? { ...assignment, [field]: value }
          : assignment
      ),
    }));
  };

  const addPicAssignment = () => {
    patchSelectedProject((project) => ({
      ...project,
      picAssignments: [...project.picAssignments, createEmptyPicAssignment()],
    }));
  };

  const removePicAssignment = (assignmentId: string) => {
    patchSelectedProject((project) => {
      const nextAssignments = project.picAssignments.filter(
        (assignment) => assignment.id !== assignmentId
      );

      return {
        ...project,
        picAssignments: nextAssignments.length
          ? nextAssignments
          : [createEmptyPicAssignment()],
      };
    });
  };

  const addProject = () => {
    const name = newProjectName.trim();

    if (!name) {
      notifyError("Masukkan nama proyek terlebih dahulu.");
      return;
    }

    const nextProject = createEmptyProject(name);
    setProjects((prevProjects) => [nextProject, ...prevProjects]);
    setSelectedProjectId(nextProject.id);
    setNewProjectName("");
    setReportDate(todayDateString());
    notifySuccess("Proyek baru ditambahkan.");
  };

  const deleteSelectedProject = () => {
    if (!selectedProject) return;
    if (!window.confirm(`Hapus proyek "${selectedProject.name}"?`)) return;

    setProjects((prevProjects) =>
      prevProjects.filter((project) => project.id !== selectedProject.id)
    );
    notifySuccess("Proyek dihapus.");
  };

  const resetSelectedProject = () => {
    if (!selectedProject) return;
    if (!window.confirm(`Reset data harian untuk proyek "${selectedProject.name}"?`)) {
      return;
    }

    patchSelectedProject((project) => ({
      ...project,
      nearestTarget: "",
      todayWork: "",
      picAssignments: [createEmptyPicAssignment()],
      blockers: "",
      progress: "",
      notes: "",
    }));
    setReportDate(todayDateString());
    notifySuccess("Form proyek direset.");
  };

  const saveTemplate = () => {
    if (!selectedProject) {
      notifyError("Pilih proyek terlebih dahulu.");
      return;
    }

    const name = templateName.trim() || `${selectedProject.name} Template`;
    const nextTemplate: TemplateRecord = {
      id: createId(),
      name,
      nearestTarget: selectedProject.nearestTarget,
      todayWork: selectedProject.todayWork,
      picAssignments: clonePicAssignments(selectedProject.picAssignments),
      blockers: selectedProject.blockers,
      progress: selectedProject.progress,
      notes: selectedProject.notes,
      createdAt: new Date().toISOString(),
    };

    setTemplates((prevTemplates) => [nextTemplate, ...prevTemplates]);
    setTemplateName("");
    notifySuccess("Template disimpan.");
  };

  const applyTemplate = (template: TemplateRecord) => {
    if (!selectedProjectId) {
      notifyError("Buat atau pilih proyek terlebih dahulu.");
      return;
    }

    patchSelectedProject((project) => ({
      ...project,
      nearestTarget: template.nearestTarget,
      todayWork: template.todayWork,
      picAssignments: clonePicAssignments(template.picAssignments),
      blockers: template.blockers,
      progress: template.progress,
      notes: template.notes,
    }));
    notifySuccess(`Template "${template.name}" diterapkan.`);
  };

  const deleteTemplate = (templateId: string) => {
    if (!window.confirm("Hapus template ini?")) return;

    setTemplates((prevTemplates) =>
      prevTemplates.filter((template) => template.id !== templateId)
    );
    notifySuccess("Template dihapus.");
  };

  const saveHistorySnapshot = () => {
    if (!selectedProject) {
      notifyError("Pilih proyek terlebih dahulu.");
      return;
    }

    const snapshot = snapshotFromProject(selectedProject);
    const nextHistoryItem: ReportHistoryRecord = {
      id: createId(),
      projectId: selectedProject.id,
      projectName: selectedProject.name,
      report: buildReport(snapshot, reportDate),
      createdAt: new Date().toISOString(),
      snapshot,
    };

    setHistory((prevHistory) => [nextHistoryItem, ...prevHistory]);
    setHistoryPreviewId(nextHistoryItem.id);
    notifySuccess("Snapshot laporan disimpan.");
  };

  const applyHistorySnapshot = () => {
    if (!previewHistoryItem) return;

    patchSelectedProject((project) => ({
      ...project,
      name: previewHistoryItem.snapshot.name || project.name,
      nearestTarget: previewHistoryItem.snapshot.nearestTarget,
      todayWork: previewHistoryItem.snapshot.todayWork,
      picAssignments: clonePicAssignments(previewHistoryItem.snapshot.picAssignments),
      blockers: previewHistoryItem.snapshot.blockers,
      progress: previewHistoryItem.snapshot.progress,
      notes: previewHistoryItem.snapshot.notes,
    }));
    setReportDate(todayDateString());
    notifySuccess("Snapshot dipakai sebagai data hari ini.");
  };

  const copyReport = async (report: string) => {
    try {
      await navigator.clipboard.writeText(report);
      notifySuccess("Laporan disalin ke clipboard.");
    } catch (error) {
      console.error("Failed to copy report:", error);
      notifyError("Gagal menyalin laporan.");
    }
  };

  const sendReport = async (report: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: selectedProject?.name || "Laporan Proyek",
          text: report,
        });
        notifySuccess("Laporan siap dibagikan.");
        return;
      } catch (error) {
        console.error("Share cancelled or failed:", error);
      }
    }

    window.open(
      `https://wa.me/?text=${encodeURIComponent(report)}`,
      "_blank",
      "noopener,noreferrer"
    );
    notifySuccess("Membuka WhatsApp Web untuk mengirim laporan.");
  };

  return (
    <div className="w-full">
      <ToastContainer newestOnTop />

      <section className="surface-panel p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[0.64rem] uppercase tracking-[0.24em] text-[#74685d] dark:text-[#9ba5ad]">
              Workspace
            </p>
            <h1 className="mt-2 font-display text-3xl leading-none text-[#1f1a16] dark:text-[#eef1f3]">
              Project Managing
            </h1>
            <p className="mt-2 text-sm text-[#74685d] dark:text-[#9ba5ad]">
              {projects.length} proyek, {templates.length} template, {filteredHistory.length} riwayat
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addProject();
                }
              }}
              placeholder="Tambah proyek baru"
              className="panel-input min-w-[240px]"
              aria-label="Tambah proyek baru"
            />
            <Button
              size="sm"
              className="bg-[#1f1a16] px-4 text-white dark:bg-[#eef1f3] dark:text-[#101418]"
              onPress={addProject}
            >
              Add project
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-3 grid gap-3 xl:grid-cols-[300px,minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="surface-panel p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[0.64rem] uppercase tracking-[0.22em] text-[#74685d] dark:text-[#9ba5ad]">
                Projects
              </p>
              <Button
                size="sm"
                variant="flat"
                className="bg-[#7a3f32] px-3 text-white"
                isDisabled={!selectedProject}
                onPress={deleteSelectedProject}
              >
                Delete
              </Button>
            </div>

            <div className="mt-3 space-y-2">
              {!projects.length ? (
                <p className="text-sm text-[#74685d] dark:text-[#9ba5ad]">
                  Tambahkan proyek pertama Anda.
                </p>
              ) : (
                projects.map((project) => {
                  const isActive = project.id === selectedProjectId;

                  return (
                    <button
                      key={project.id}
                      type="button"
                      className={clsx(
                        "w-full rounded-2xl border px-3 py-3 text-left transition",
                        isActive
                          ? "border-[#407c69] bg-[#407c69]/10"
                          : "border-black/10 bg-black/[0.02] hover:border-[#407c69]/25 hover:bg-[#407c69]/5 dark:border-white/10 dark:bg-white/[0.03]"
                      )}
                      onClick={() => setSelectedProjectId(project.id)}
                    >
                      <p className="truncate text-sm font-medium text-[#1f1a16] dark:text-[#eef1f3]">
                        {project.name}
                      </p>
                      <p className="mt-1 text-[0.68rem] uppercase tracking-[0.18em] text-[#74685d] dark:text-[#9ba5ad]">
                        {formatDateTime(project.updatedAt)}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="surface-panel p-4">
            <p className="text-[0.64rem] uppercase tracking-[0.22em] text-[#74685d] dark:text-[#9ba5ad]">
              Templates
            </p>

            <div className="mt-3 flex flex-col gap-2">
              <input
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder="Nama template"
                className="panel-input"
                aria-label="Nama template"
              />
              <Button
                size="sm"
                variant="flat"
                className="bg-[#407c69] px-4 text-white"
                isDisabled={!selectedProject}
                onPress={saveTemplate}
              >
                Save template
              </Button>
            </div>

            <div className="mt-3 space-y-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="rounded-2xl border border-black/10 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <p className="text-sm font-medium text-[#1f1a16] dark:text-[#eef1f3]">
                    {template.name}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="flat"
                      className="border border-black/10 bg-white/80 px-3 text-[#1f1a16] dark:border-white/10 dark:bg-white/5 dark:text-[#eef1f3]"
                      onPress={() => applyTemplate(template)}
                    >
                      Apply
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      className="bg-[#7a3f32] px-3 text-white"
                      onPress={() => deleteTemplate(template.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="surface-panel p-4">
            {!selectedProject ? (
              <p className="text-sm text-[#74685d] dark:text-[#9ba5ad]">
                Pilih atau tambahkan proyek untuk mulai mengisi laporan.
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[0.64rem] uppercase tracking-[0.22em] text-[#74685d] dark:text-[#9ba5ad]">
                    Form proyek
                  </p>
                  <Button
                    size="sm"
                    variant="flat"
                    className="border border-black/10 bg-white/80 px-3 text-[#1f1a16] dark:border-white/10 dark:bg-white/5 dark:text-[#eef1f3]"
                    onPress={resetSelectedProject}
                  >
                    Reset form
                  </Button>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr),220px]">
                  <div>
                    <label htmlFor="project-name" className="text-[0.64rem] uppercase tracking-[0.22em] text-[#74685d] dark:text-[#9ba5ad]">
                      Nama proyek
                    </label>
                    <input
                      id="project-name"
                      value={selectedProject.name}
                      onChange={(event) => updateSelectedProjectField("name", event.target.value)}
                      className="panel-input mt-2"
                      aria-label="Nama proyek"
                    />
                  </div>
                  <div>
                    <label htmlFor="project-report-date" className="text-[0.64rem] uppercase tracking-[0.22em] text-[#74685d] dark:text-[#9ba5ad]">
                      Tanggal laporan
                    </label>
                    <input
                      id="project-report-date"
                      type="date"
                      value={reportDate}
                      onChange={(event) => setReportDate(event.target.value)}
                      className="panel-input mt-2"
                      aria-label="Tanggal laporan"
                    />
                  </div>
                </div>

                <div className="mt-3 grid gap-3 xl:grid-cols-2">
                  <div>
                    <label htmlFor="project-target" className="text-[0.64rem] uppercase tracking-[0.22em] text-[#74685d] dark:text-[#9ba5ad]">
                      Target terdekat
                    </label>
                    <textarea
                      id="project-target"
                      value={selectedProject.nearestTarget}
                      onChange={(event) => updateSelectedProjectField("nearestTarget", event.target.value)}
                      className="planner-textarea mt-2 min-h-[120px]"
                      aria-label="Target terdekat"
                    />
                  </div>
                  <div>
                    <label htmlFor="project-today-work" className="text-[0.64rem] uppercase tracking-[0.22em] text-[#74685d] dark:text-[#9ba5ad]">
                      Pekerjaan hari ini
                    </label>
                    <textarea
                      id="project-today-work"
                      value={selectedProject.todayWork}
                      onChange={(event) => updateSelectedProjectField("todayWork", event.target.value)}
                      className="planner-textarea mt-2 min-h-[120px]"
                      aria-label="Pekerjaan hari ini"
                    />
                  </div>
                  <div className="xl:col-span-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[0.64rem] uppercase tracking-[0.22em] text-[#74685d] dark:text-[#9ba5ad]">
                        PIC per feature
                      </p>
                      <Button
                        size="sm"
                        variant="flat"
                        className="bg-[#407c69] px-3 text-white"
                        onPress={addPicAssignment}
                      >
                        Add PIC
                      </Button>
                    </div>
                    <div className="mt-2 space-y-2">
                      {selectedProject.picAssignments.map((assignment, index) => (
                        <div
                          key={assignment.id}
                          className="grid gap-2 md:grid-cols-[minmax(0,220px),minmax(0,1fr),90px]"
                        >
                          <input
                            value={assignment.person}
                            onChange={(event) => updatePicAssignment(assignment.id, "person", event.target.value)}
                            className="panel-input"
                            placeholder={`PIC ${index + 1}`}
                            aria-label={`Nama PIC ${index + 1}`}
                          />
                          <input
                            value={assignment.feature}
                            onChange={(event) => updatePicAssignment(assignment.id, "feature", event.target.value)}
                            className="panel-input"
                            placeholder="Feature / tanggung jawab"
                            aria-label={`Feature PIC ${index + 1}`}
                          />
                          <Button
                            size="sm"
                            variant="flat"
                            className="bg-[#7a3f32] px-3 text-white"
                            onPress={() => removePicAssignment(assignment.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="project-progress" className="text-[0.64rem] uppercase tracking-[0.22em] text-[#74685d] dark:text-[#9ba5ad]">
                      Progress
                    </label>
                    <input
                      id="project-progress"
                      value={selectedProject.progress}
                      onChange={(event) => updateSelectedProjectField("progress", event.target.value)}
                      className="panel-input mt-2"
                      placeholder="Contoh: 75% selesai"
                      aria-label="Progress"
                    />
                  </div>
                  <div>
                    <label htmlFor="project-blockers" className="text-[0.64rem] uppercase tracking-[0.22em] text-[#74685d] dark:text-[#9ba5ad]">
                      Kendala
                    </label>
                    <textarea
                      id="project-blockers"
                      value={selectedProject.blockers}
                      onChange={(event) => updateSelectedProjectField("blockers", event.target.value)}
                      className="planner-textarea mt-2 min-h-[120px]"
                      aria-label="Kendala"
                    />
                  </div>
                  <div className="xl:col-span-2">
                    <label htmlFor="project-notes" className="text-[0.64rem] uppercase tracking-[0.22em] text-[#74685d] dark:text-[#9ba5ad]">
                      Catatan tambahan
                    </label>
                    <textarea
                      id="project-notes"
                      value={selectedProject.notes}
                      onChange={(event) => updateSelectedProjectField("notes", event.target.value)}
                      className="planner-textarea mt-2 min-h-[120px]"
                      aria-label="Catatan tambahan"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.3fr),360px]">
            <div className="surface-panel p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[0.64rem] uppercase tracking-[0.22em] text-[#74685d] dark:text-[#9ba5ad]">
                    Report Preview
                  </p>
                  <p className="mt-1 text-sm text-[#74685d] dark:text-[#9ba5ad]">
                    Template laporan harian siap disalin dan dikirim.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="bg-[#1f1a16] px-3 text-white dark:bg-[#eef1f3] dark:text-[#101418]"
                    isDisabled={!selectedProject}
                    onPress={() => copyReport(reportPreview)}
                  >
                    Copy report
                  </Button>
                  <Button
                    size="sm"
                    variant="flat"
                    className="bg-[#407c69] px-3 text-white"
                    isDisabled={!selectedProject}
                    onPress={() => sendReport(reportPreview)}
                  >
                    Send
                  </Button>
                  <Button
                    size="sm"
                    variant="flat"
                    className="border border-black/10 bg-white/80 px-3 text-[#1f1a16] dark:border-white/10 dark:bg-white/5 dark:text-[#eef1f3]"
                    isDisabled={!selectedProject}
                    onPress={saveHistorySnapshot}
                  >
                    Save snapshot
                  </Button>
                </div>
              </div>
              <pre className="mt-4 overflow-x-auto rounded-2xl border border-black/10 bg-black/[0.02] p-4 font-mono text-sm leading-7 text-[#1f1a16] dark:border-white/10 dark:bg-white/[0.03] dark:text-[#eef1f3]">
                {selectedProject ? reportPreview : "Belum ada proyek yang dipilih."}
              </pre>
            </div>

            <div className="surface-panel p-4">
              <p className="text-[0.64rem] uppercase tracking-[0.22em] text-[#74685d] dark:text-[#9ba5ad]">
                History
              </p>
              {!filteredHistory.length ? (
                <p className="mt-3 text-sm text-[#74685d] dark:text-[#9ba5ad]">
                  Belum ada riwayat laporan untuk proyek ini.
                </p>
              ) : (
                <>
                  <div className="mt-3 max-h-[210px] space-y-2 overflow-y-auto pr-1">
                    {filteredHistory.map((entry) => {
                      const isActive = entry.id === historyPreviewId;
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          className={clsx(
                            "w-full rounded-2xl border px-3 py-3 text-left transition",
                            isActive
                              ? "border-[#407c69] bg-[#407c69]/10"
                              : "border-black/10 bg-black/[0.02] hover:border-[#407c69]/25 hover:bg-[#407c69]/5 dark:border-white/10 dark:bg-white/[0.03]"
                          )}
                          onClick={() => setHistoryPreviewId(entry.id)}
                        >
                          <p className="text-sm font-medium text-[#1f1a16] dark:text-[#eef1f3]">
                            {entry.projectName}
                          </p>
                          <p className="mt-1 text-[0.68rem] uppercase tracking-[0.18em] text-[#74685d] dark:text-[#9ba5ad]">
                            {formatDateTime(entry.createdAt)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 rounded-2xl border border-black/10 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-[0.64rem] uppercase tracking-[0.22em] text-[#74685d] dark:text-[#9ba5ad]">
                      Snapshot preview
                    </p>
                    <pre className="mt-3 max-h-[220px] overflow-auto whitespace-pre-wrap font-mono text-xs leading-6 text-[#1f1a16] dark:text-[#eef1f3]">
                      {previewHistoryItem?.report || "Pilih snapshot untuk melihat isi laporan."}
                    </pre>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="bg-[#1f1a16] px-3 text-white dark:bg-[#eef1f3] dark:text-[#101418]"
                        isDisabled={!previewHistoryItem}
                        onPress={() => (previewHistoryItem ? copyReport(previewHistoryItem.report) : undefined)}
                      >
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        variant="flat"
                        className="bg-[#407c69] px-3 text-white"
                        isDisabled={!previewHistoryItem}
                        onPress={() => (previewHistoryItem ? sendReport(previewHistoryItem.report) : undefined)}
                      >
                        Send
                      </Button>
                      <Button
                        size="sm"
                        variant="flat"
                        className="border border-black/10 bg-white/80 px-3 text-[#1f1a16] dark:border-white/10 dark:bg-white/5 dark:text-[#eef1f3]"
                        isDisabled={!previewHistoryItem}
                        onPress={applyHistorySnapshot}
                      >
                        Use template
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
