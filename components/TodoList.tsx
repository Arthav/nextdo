"use client";

import clsx from "clsx";
import confetti from "canvas-confetti";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { driver } from "driver.js";
import { useEffect, useState } from "react";
import { Bounce, ToastContainer, toast } from "react-toastify";
import { Button } from "@nextui-org/button";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@nextui-org/modal";

import "driver.js/dist/driver.css";
import "react-toastify/dist/ReactToastify.css";

import { instruction } from "@/components/constant/instruction";
import { HistoryFileIcon, TrashIcon } from "@/components/icons";
import "@/styles/driver-js.css";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

interface TaskHistoryEntry {
  todos: Todo[];
  datetime: string;
}

const cloneTodos = (todos: Todo[]) => todos.map((todo) => ({ ...todo }));

const sortTaskHistory = (history: TaskHistoryEntry[]) =>
  [...history].sort(
    (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
  );

const formatDateTime = (value: number | string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

const formatDay = () =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date());

const toastOptions = {
  autoClose: 2600,
  closeOnClick: true,
  draggable: true,
  pauseOnHover: true,
  position: "bottom-right" as const,
  theme: "colored" as const,
  transition: Bounce,
};

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [taskHistory, setTaskHistory] = useState<TaskHistoryEntry[]>([]);
  const [task, setTask] = useState("");
  const [showTour, setShowTour] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initPhase, setInitPhase] = useState(true);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Todo | null>(null);
  const [historyPreview, setHistoryPreview] = useState<TaskHistoryEntry | null>(
    null
  );

  const sortedTaskHistory = sortTaskHistory(taskHistory);
  const completedCount = todos.filter((todo) => todo.completed).length;
  const pendingCount = todos.length - completedCount;
  const completionRate = todos.length
    ? Math.round((completedCount / todos.length) * 100)
    : 0;
  const dayLabel = formatDay();

  useEffect(() => {
    const storedTodos = localStorage.getItem("todos");
    const storedTaskHistory = localStorage.getItem("taskHistory");
    const storedShowTour = localStorage.getItem("tourShown");

    if (storedTodos) {
      setTodos(JSON.parse(storedTodos));
    }

    if (storedTaskHistory) {
      setTaskHistory(JSON.parse(storedTaskHistory));
    }

    if (storedShowTour === null) {
      setShowTour(true);
    }

    setInitPhase(false);
  }, []);

  useEffect(() => {
    if (initPhase) return;
    localStorage.setItem("todos", JSON.stringify(todos));
  }, [initPhase, todos]);

  useEffect(() => {
    if (initPhase) return;
    localStorage.setItem("taskHistory", JSON.stringify(taskHistory));
  }, [initPhase, taskHistory]);

  useEffect(() => {
    if (!showTour) return;

    const driverObj = driver({
      popoverClass: "driverjs-theme",
      showProgress: true,
      steps: [
        {
          element: "#todo-input",
          popover: {
            title: "Input",
            description: "Write a quick thought or a rough task here.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#add-task-button",
          popover: {
            title: "Add",
            description: "Turn the draft into a task card.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#export-button",
          popover: {
            title: "Export",
            description: "Copy your list as plain text or HTML.",
            side: "bottom",
            align: "start",
          },
        },
        {
          element: "#todo-list",
          popover: {
            title: "List",
            description: "Track progress, edit wording, or delete tasks here.",
            side: "top",
            align: "start",
          },
        },
      ],
    });

    const timer = window.setTimeout(() => {
      driverObj.drive();
      localStorage.setItem("tourShown", "true");
      setShowTour(false);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [showTour]);

  const notifyError = (message: string) => toast.error(message, toastOptions);

  const notifySuccess = (message: string) =>
    toast.success(message, toastOptions);

  const addTask = () => {
    const nextTask = task.trim();

    if (!nextTask) {
      return;
    }

    setTodos((prevTodos) => [
      ...prevTodos,
      { id: Date.now(), text: nextTask, completed: false },
    ]);
    setTask("");
  };

  const generateTasksWithAI = async (prompt: string) => {
    setLoading(true);

    try {
      const geminiKey = process.env.NEXT_PUBLIC_GEMINI_KEY;

      if (!geminiKey) {
        throw new Error("Missing NEXT_PUBLIC_GEMINI_KEY");
      }

      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: {
          role: "system",
          parts: [{ text: instruction.todoList }],
        },
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 150,
          topP: 0.9,
          topK: 50,
        },
      });

      const result = await model.generateContent(prompt);
      const aiTasks = result.response
        .text()
        .split("\n")
        .map((line, index) => ({
          id: Date.now() + index,
          text: line.replace(/^\d+\.\s*/, "").trim(),
          completed: false,
        }))
        .filter((generatedTask) => generatedTask.text !== "");

      if (!aiTasks.length) {
        notifyError("AI did not return any usable tasks.");
        return;
      }

      setTodos((prevTodos) => [...prevTodos, ...aiTasks]);
      setTask("");
      notifySuccess("AI suggestions added.");
    } catch (error) {
      console.error("Error generating tasks with AI:", error);
      notifyError("AI suggestions failed. Check your Gemini key.");
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = (id: number) => {
    setTodos((prevTodos) =>
      prevTodos.map((todo) => {
        if (todo.id !== id) {
          return todo;
        }

        if (!todo.completed) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
        }

        return { ...todo, completed: !todo.completed };
      })
    );
  };

  const deleteTask = (id: number) => {
    setTodos((prevTodos) => prevTodos.filter((todo) => todo.id !== id));
  };

  const clearAllTasks = () => {
    if (todos.length) {
      setTaskHistory((prevHistory) => [
        ...prevHistory,
        {
          todos: cloneTodos(todos),
          datetime: new Date().toISOString(),
        },
      ]);
    }

    setTodos([]);
    setIsClearModalOpen(false);
    notifySuccess("List cleared and saved to history.");
  };

  const openHistoryModal = () => {
    setHistoryPreview(sortedTaskHistory[0] ?? null);
    setIsHistoryModalOpen(true);
  };

  const restoreHistory = () => {
    if (!historyPreview) {
      return;
    }

    setTodos(cloneTodos(historyPreview.todos));
    setIsHistoryModalOpen(false);
    notifySuccess("Snapshot restored.");
  };

  const saveEditedTask = () => {
    if (!editingTask) {
      return;
    }

    const nextText = editingTask.text.trim();

    if (!nextText) {
      notifyError("Task text cannot be empty.");
      return;
    }

    setTodos((prevTodos) =>
      prevTodos.map((todo) =>
        todo.id === editingTask.id ? { ...editingTask, text: nextText } : todo
      )
    );
    setIsEditModalOpen(false);
    setEditingTask(null);
    notifySuccess("Task updated.");
  };

  const copyPlainText = async () => {
    const formattedTasks = todos
      .map(
        (todo, index) =>
          `${index + 1}. ${todo.text}${todo.completed ? " (Completed)" : ""}`
      )
      .join("\n");

    await navigator.clipboard.writeText(formattedTasks);
    setIsExportModalOpen(false);
    notifySuccess("Plain text copied.");
  };

  const copyHtml = async () => {
    const formattedTasks = `<ol>\n${todos
      .map(
        (todo) =>
          `  <li>${todo.text}${todo.completed ? " (Completed)" : ""}</li>`
      )
      .join("\n")}\n</ol>`;

    await navigator.clipboard.writeText(formattedTasks);
    setIsExportModalOpen(false);
    notifySuccess("HTML copied.");
  };

  return (
    <div className="mx-auto w-full">
      <ToastContainer newestOnTop />

      <section className="surface-panel p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[0.64rem] uppercase tracking-[0.28em] text-[#74685d] dark:text-[#9ba5ad]">
              Today
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="font-display text-3xl leading-none text-[#1f1a16] sm:text-[2.45rem] dark:text-[#eef1f3]">
                Tasks
              </h1>
              <span className="text-sm text-[#74685d] dark:text-[#9ba5ad]">
                {dayLabel}
              </span>
            </div>
            <p className="mt-2 text-sm text-[#74685d] dark:text-[#9ba5ad]">
              {pendingCount} open, {completedCount} done, {taskHistory.length} saved
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="flat"
              className="bg-[#7a3f32] px-3 text-white"
              isDisabled={!todos.length}
              onPress={() => setIsClearModalOpen(true)}
              aria-label="Clear all tasks"
            >
              <TrashIcon size={16} />
              Clear
            </Button>
            <Button
              size="sm"
              variant="flat"
              className="border border-black/10 bg-white/80 px-3 text-[#1f1a16] dark:border-white/10 dark:bg-white/5 dark:text-[#eef1f3]"
              isDisabled={!taskHistory.length}
              onPress={openHistoryModal}
              aria-label="Open history"
            >
              <HistoryFileIcon size={16} />
              History
            </Button>
          </div>
        </div>

        <div className="mt-4">
          <textarea
            id="todo-input"
            value={task}
            onChange={(event) => setTask(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                addTask();
              }
            }}
            placeholder="What needs to get done?"
            aria-label="Add a new task"
            className={clsx(
              "planner-textarea",
              task.includes("\n") ? "min-h-[132px]" : "min-h-[108px]"
            )}
          />
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-black/[0.08] dark:bg-white/10">
              <div
                className="h-full rounded-full bg-[#407c69] transition-[width] duration-300"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <p className="text-xs text-[#74685d] dark:text-[#9ba5ad]">
              {completionRate}% complete
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              id="add-task-button"
              size="sm"
              className="bg-[#1f1a16] px-4 text-white dark:bg-[#eef1f3] dark:text-[#101418]"
              isDisabled={!task.trim()}
              onPress={addTask}
              aria-label="Add task"
            >
              Add
            </Button>
            <Button
              id="export-button"
              size="sm"
              variant="flat"
              className="border border-black/10 bg-white/80 px-4 text-[#1f1a16] dark:border-white/10 dark:bg-white/5 dark:text-[#eef1f3]"
              isDisabled={!todos.length}
              onPress={() => setIsExportModalOpen(true)}
              aria-label="Export tasks"
            >
              Export
            </Button>
            <Button
              size="sm"
              className="bg-[#407c69] px-4 text-white"
              isDisabled={!task.trim() || loading}
              onPress={() => generateTasksWithAI(task.trim())}
              aria-label="Generate tasks with AI"
            >
              {loading ? "Generating..." : "Use AI"}
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-3" id="todo-list">
        {!todos.length ? (
          <div className="surface-panel px-4 py-8 text-center sm:px-5">
            <p className="text-sm text-[#74685d] dark:text-[#9ba5ad]">
              No tasks yet. Add one to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {todos.map((todo, index) => (
              <article
                key={todo.id}
                className={clsx("todo-card", todo.completed && "complete")}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-[0.64rem] uppercase tracking-[0.22em] text-[#74685d] dark:text-[#9ba5ad]">
                      <span className="font-mono">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span>{formatDateTime(todo.id)}</span>
                      {todo.completed ? <span>Done</span> : null}
                    </div>
                    <p
                      className={clsx(
                        "mt-2 whitespace-pre-wrap break-words text-[0.98rem] leading-7 text-[#1f1a16] dark:text-[#eef1f3]",
                        todo.completed && "line-through opacity-70"
                      )}
                    >
                      {todo.text}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Button
                      size="sm"
                      className={clsx(
                        "px-3 text-white",
                        todo.completed ? "bg-[#6d675f]" : "bg-[#407c69]"
                      )}
                      onPress={() => toggleTask(todo.id)}
                      aria-label={
                        todo.completed ? "Mark task active" : "Mark task done"
                      }
                    >
                      {todo.completed ? "Undo" : "Done"}
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      className="border border-black/10 bg-white/80 px-3 text-[#1f1a16] dark:border-white/10 dark:bg-white/5 dark:text-[#eef1f3]"
                      onPress={() => {
                        setEditingTask(todo);
                        setIsEditModalOpen(true);
                      }}
                      aria-label="Edit task"
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      className="bg-[#7a3f32] px-3 text-white"
                      onPress={() => deleteTask(todo.id)}
                      aria-label="Delete task"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Modal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
      >
        <ModalContent>
          <ModalHeader>
            <h3 className="font-display text-3xl">Clear list?</h3>
          </ModalHeader>
          <ModalBody>
            <p>Your current tasks will be saved in history first.</p>
          </ModalBody>
          <ModalFooter>
            <Button className="bg-[#7a3f32] text-white" onPress={clearAllTasks}>
              Archive and clear
            </Button>
            <Button variant="light" onPress={() => setIsClearModalOpen(false)}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        size="lg"
      >
        <ModalContent>
          <ModalHeader>
            <h3 className="font-display text-3xl">Export</h3>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-2">
              {todos.map((todo, index) => (
                <div
                  key={todo.id}
                  className="rounded-2xl border border-black/10 bg-black/[0.02] px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-sm text-[#74685d] dark:text-[#9ba5ad]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className={todo.completed ? "line-through opacity-70" : ""}>
                      {todo.text}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={copyPlainText}>
              Copy text
            </Button>
            <Button variant="flat" onPress={copyHtml}>
              Copy HTML
            </Button>
            <Button variant="light" onPress={() => setIsExportModalOpen(false)}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTask(null);
        }}
      >
        <ModalContent>
          <ModalHeader>
            <h3 className="font-display text-3xl">Edit task</h3>
          </ModalHeader>
          <ModalBody>
            <textarea
              value={editingTask?.text || ""}
              onChange={(event) =>
                setEditingTask(
                  editingTask
                    ? { ...editingTask, text: event.target.value }
                    : null
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                  event.preventDefault();
                  saveEditedTask();
                }
              }}
              placeholder="Refine the task"
              aria-label="Edit task"
              className="planner-textarea min-h-[140px]"
            />
          </ModalBody>
          <ModalFooter>
            <Button
              className="bg-[#1f1a16] text-white dark:bg-[#eef1f3] dark:text-[#101418]"
              onPress={saveEditedTask}
            >
              Save
            </Button>
            <Button
              variant="light"
              onPress={() => {
                setIsEditModalOpen(false);
                setEditingTask(null);
              }}
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        size="4xl"
      >
        <ModalContent>
          <ModalHeader>
            <h3 className="font-display text-3xl">History</h3>
          </ModalHeader>
          <ModalBody>
            {!sortedTaskHistory.length ? (
              <p className="text-sm text-[#74685d] dark:text-[#9ba5ad]">
                No saved snapshots yet.
              </p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[0.86fr,1.14fr]">
                <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
                  {sortedTaskHistory.map((entry) => {
                    const isSelected =
                      historyPreview?.datetime === entry.datetime;

                    return (
                      <button
                        key={entry.datetime}
                        type="button"
                        className={clsx(
                          "w-full rounded-[18px] border px-4 py-3 text-left transition",
                          isSelected
                            ? "border-[#407c69] bg-[#407c69]/10"
                            : "border-black/10 bg-black/[0.02] hover:border-[#407c69]/30 hover:bg-[#407c69]/5 dark:border-white/10 dark:bg-white/[0.03]"
                        )}
                        onClick={() => setHistoryPreview(entry)}
                      >
                        <p className="text-[0.64rem] uppercase tracking-[0.22em] text-[#74685d] dark:text-[#9ba5ad]">
                          {formatDateTime(entry.datetime)}
                        </p>
                        <p className="mt-1 text-sm text-[#1f1a16] dark:text-[#eef1f3]">
                          {entry.todos.length} task
                          {entry.todos.length === 1 ? "" : "s"}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-[18px] border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-[0.64rem] uppercase tracking-[0.22em] text-[#74685d] dark:text-[#9ba5ad]">
                    Preview
                  </p>
                  {historyPreview ? (
                    <ul className="mt-3 max-h-[280px] space-y-2 overflow-y-auto pr-1">
                      {historyPreview.todos.map((todo) => (
                        <li
                          key={todo.id}
                          className="rounded-2xl border border-black/10 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]"
                        >
                          <span className={todo.completed ? "line-through opacity-70" : ""}>
                            {todo.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-[#74685d] dark:text-[#9ba5ad]">
                      Select a snapshot to preview it.
                    </p>
                  )}
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              className="bg-[#1f1a16] text-white dark:bg-[#eef1f3] dark:text-[#101418]"
              isDisabled={!historyPreview}
              onPress={restoreHistory}
            >
              Restore
            </Button>
            <Button variant="light" onPress={() => setIsHistoryModalOpen(false)}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
