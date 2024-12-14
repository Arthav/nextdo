"use client";

import React, { useState, useEffect } from "react";
import { Navbar as NextUINavbar } from "@nextui-org/navbar";
import { Button } from "@nextui-org/button";
import { Listbox, ListboxItem } from "@nextui-org/listbox";
import { TrashIcon } from "@/components/icons";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalContent,
} from "@nextui-org/modal";
import confetti from "canvas-confetti";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import "@/styles/driver-js.css";

import {instruction} from "@/components/constant/instruction";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

const TodoList: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [task, setTask] = useState("");
  const [initPhase, setInitPhase] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Todo | null>(null);
  const isMultiline = task.split("\n").length > 1;

  // Gemini
  const [loading, setLoading] = useState(false);

  const generateTasksWithAI = async (prompt: string) => {
    setLoading(true);
    try {
      const geminiKey = process.env.NEXT_PUBLIC_GEMINI_KEY;
      if (!geminiKey) {
        throw new Error("Missing API Key");
      }

      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: {
          role: "system",
          parts: [
            {
              text: instruction.todoList,
            },
          ],
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
        .map((task, index) => ({
          id: Date.now() + index,
          text: task.replace(/^\d+\.\s*/, "").trim(),
          completed: false,
        }))
        .filter((task) => task.text !== "");

      setTodos((prevTodos) => [...prevTodos, ...aiTasks]);
    } catch (error) {
      console.error("Error generating tasks with AI:", error);
    } finally {
      setLoading(false);
    }
  };

  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const storedTodos = localStorage.getItem("todos");
    if (storedTodos) {
      setTodos(JSON.parse(storedTodos));
    }
    setInitPhase(false);
  }, []);

  useEffect(() => {
    const storedShowTour = localStorage.getItem("tourShown");
    if (storedShowTour === null) {
      setShowTour(true);
    }
  }, []);

  useEffect(() => {
    if (showTour) {
      const driverObj = driver({
        popoverClass: "driverjs-theme",
        showProgress: true,
        steps: [
          {
            element: "#todo-input",
            popover: {
              title: "Input Field",
              description:
                "Type a todo item and press CTRL + Enter to add it to the list.",
              side: "left",
              align: "start",
            },
          },
          {
            element: "#add-task-button",
            popover: {
              title: "Add Task Button",
              description:
                "or use this button to add the typed task to the list.",
              side: "right",
              align: "start",
            },
          },
          {
            element: "#export-button",
            popover: {
              title: "Export",
              description:
                "You can export your todos to a copyable text by clicking this button.",
              side: "top",
              align: "start",
            },
          },
          {
            element: "#todo-list",
            popover: {
              title: "Task List",
              description:
                "Here is the list of your tasks. You can click on them to mark them as completed.",
              side: "top",
              align: "start",
            },
          },
          {
            popover: {
              title: "That's it!",
              description:
                "And that is all, go ahead use the app to manage your tasks.",
            },
          },
        ],
      });

      // Small delay to ensure DOM elements are rendered
      setTimeout(() => {
        driverObj.drive();
      }, 500);

      // Save tour state to localStorage
      localStorage.setItem("tourShown", "true");
      setShowTour(false);
    }
  }, [showTour]);

  useEffect(() => {
    if (initPhase) return;
    localStorage.setItem("todos", JSON.stringify(todos));
  }, [todos]);

  const addTask = () => {
    if (task.trim()) {
      setTodos([...todos, { id: Date.now(), text: task, completed: false }]);
      setTask("");
    }
  };

  const toggleTask = (id: number) => {
    setTodos((prevTodos) => {
      const updatedTodos = prevTodos.map((todo) => {
        if (todo.id === id) {
          if (!todo.completed) {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
            });
          }
          return { ...todo, completed: !todo.completed };
        }
        return todo;
      });
      return updatedTodos;
    });
  };

  const deleteTask = (id: number) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  const confirmClearAllTasks = () => {
    setIsModalVisible(true);
  };

  const handleClearAll = () => {
    setTodos([]);
    setIsModalVisible(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      addTask();
    }
  };

  const handleExport = () => {
    setIsExportModalOpen(true);
  };

  const copyToClipboard = () => {
    const formattedTasks = todos
      .map(
        (todo, index) =>
          `${index + 1}. ${todo.text}${todo.completed ? " (Completed)" : ""}`
      )
      .join("\n");

    navigator.clipboard.writeText(formattedTasks).then(() => {
      setIsExportModalOpen(false);
    });
  };

  const copyToClipboardHtml = () => {
    const formattedTasks = `<ol>\n${todos
      .map(
        (todo) =>
          `  <li>${todo.text}${todo.completed ? " (Completed)" : ""}</li>`
      )
      .join("\n")}\n</ol>`;

    navigator.clipboard.writeText(formattedTasks).then(() => {
      setIsExportModalOpen(false);
    });
  };

  const handleEditTask = (todo: Todo) => {
    setEditingTask(todo);
    setIsEditModalOpen(true);
  };

  const saveEditedTask = () => {
    if (editingTask) {
      setTodos(
        todos.map((todo) => (todo.id === editingTask.id ? editingTask : todo))
      );
      setIsEditModalOpen(false);
      setEditingTask(null);
    }
  };

  return (
    <div>
      <NextUINavbar position="sticky" className="pt-8 sm:mb-0 pb-2">
        <div className="w-full max-w-[1024px] mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-2 mb-8">
            <div className="flex gap-2 w-full">
              <Button
                size="sm"
                className="bg-red-500 text-white h-12"
                onPress={confirmClearAllTasks}
                aria-label="Clear all tasks"
              >
                <TrashIcon size={20} />
              </Button>
              <textarea
                id="todo-input"
                value={task}
                onChange={(e) => setTask(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Add a new task"
                aria-label="Add a new task"
                className={`w-full rounded-2xl p-2 resize-none ${
                  isMultiline ? "h-24" : "h-12"
                }`}
              />
            </div>{" "}
            <div className="flex gap-2 w-full md:w-auto justify-end">
              <Button
                id="add-task-button"
                className="h-12 flex-1 md:flex-none"
                onPress={addTask}
                aria-label="Add task"
              >
                Add Task
              </Button>
              <Button
                id="export-button"
                onClick={handleExport}
                className="bg-purple-600 text-white hover:bg-purple-700 h-12 flex-1 md:flex-none"
              >
                Export
              </Button>
              <Button
                onPress={() => generateTasksWithAI(task)}
                disabled={loading}
                className="bg-gradient-to-br from-blue-500 to-purple-600 text-white  h-12 flex-1 md:flex-none"
              >
                {loading ? "Generating..." : "Use AI"}
              </Button>
            </div>
          </div>
        </div>
      </NextUINavbar>
      <Listbox id="todo-list" aria-label="Todo list">
        {todos.map((todo) => (
          <ListboxItem key={todo.id} textValue={todo.text}>
            <div
              className="card p-4"
              style={{ backgroundColor: todo.completed ? "#333" : "" }}
            >
              <div
                style={{
                  textDecoration: todo.completed ? "line-through" : "none",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {todo.text}
              </div>
              <div className="text-xs text-gray-500">
                {new Date(todo.id).toLocaleString()}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  onPress={() => toggleTask(todo.id)}
                  aria-label="Mark task as done"
                >
                  {todo.completed ? "Undo" : "Done"}
                </Button>
                <Button
                  size="sm"
                  color="secondary"
                  onPress={() => handleEditTask(todo)}
                  aria-label="Edit task"
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  color="warning"
                  onPress={() => deleteTask(todo.id)}
                  aria-label="Delete task"
                >
                  Delete
                </Button>
              </div>
            </div>
          </ListboxItem>
        ))}
      </Listbox>
      <Modal
        isOpen={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        aria-labelledby="modal-title"
      >
        <ModalContent>
          <ModalHeader>
            <h3 id="modal-title">Confirm Clear All</h3>
          </ModalHeader>
          <ModalBody>
            <p>Are you sure you want to clear all tasks and start new day?</p>
          </ModalBody>
          <ModalFooter>
            <Button
              color="secondary"
              onPress={handleClearAll}
              aria-label="Confirm clear all tasks"
            >
              Yes, Clear All
            </Button>
            <Button
              onPress={() => setIsModalVisible(false)}
              aria-label="Cancel clear all tasks"
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      {/* Export Modal */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        size="lg"
      >
        <ModalContent>
          <ModalHeader>Export Tasks</ModalHeader>
          <ModalBody>
            <div className="space-y-2">
              {todos.map((todo, index) => (
                <div key={todo.id} className="flex items-center gap-2">
                  <span className="font-medium">{index + 1}.</span>
                  <span className={todo.completed ? "line-through" : ""}>
                    {todo.text}
                  </span>
                </div>
              ))}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              color="secondary"
              variant="light"
              onClick={copyToClipboard}
              className="mr-auto"
            >
              Copy to Clipboard
            </Button>
            <Button
              color="secondary"
              variant="light"
              onClick={copyToClipboardHtml}
              className="mr-auto"
            >
              Copy html
            </Button>
            <Button
              color="danger"
              variant="light"
              onClick={() => setIsExportModalOpen(false)}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTask(null);
        }}
      >
        <ModalContent>
          <ModalHeader>Edit Task</ModalHeader>
          <ModalBody>
            <textarea
              id="todo-edit-input"
              value={editingTask?.text || ""}
              onChange={(e) =>
                setEditingTask(
                  editingTask ? { ...editingTask, text: e.target.value } : null
                )
              }
              placeholder="Edit your task"
              aria-label="Edit your task"
              className="w-full rounded-2xl h-24 p-2 resize-none"
            />
          </ModalBody>
          <ModalFooter>
            <Button
              color="primary"
              onPress={saveEditedTask}
              aria-label="Save edited task"
            >
              Save
            </Button>
            <Button
              onPress={() => {
                setIsEditModalOpen(false);
                setEditingTask(null);
              }}
              aria-label="Cancel edit"
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default TodoList;
