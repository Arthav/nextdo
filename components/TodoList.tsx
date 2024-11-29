import React, { useState, useEffect } from "react";
import { Navbar as NextUINavbar } from "@nextui-org/navbar";
import { Button } from "@nextui-org/button";
import { Input } from "@nextui-org/input";
import { Listbox, ListboxItem } from "@nextui-org/listbox";
import { TrashIcon } from "@/components/icons";
import { Kbd } from "@nextui-org/kbd";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalContent,
} from "@nextui-org/modal";
import confetti from "canvas-confetti";

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

  useEffect(() => {
    const storedTodos = localStorage.getItem("todos");
    if (storedTodos) {
      setTodos(JSON.parse(storedTodos));
    }
    setInitPhase(false);
  }, []);

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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey && e.key === "Enter") {
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

  return (
    <div>
      <NextUINavbar position="sticky" className="pt-8">
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
              <Input
                size="lg"
                value={task}
                onChange={(e) => setTask(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Add a new task"
                aria-label="Add a new task"
                className="w-full rounded-2xl h-12"
                endContent={<Kbd keys={["ctrl", "enter"]}></Kbd>}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto justify-end">
              <Button
                className="h-12 flex-1 md:flex-none"
                onPress={addTask}
                aria-label="Add task"
              >
                Add Task
              </Button>
              <Button
                onClick={handleExport}
                className="bg-purple-600 text-white hover:bg-purple-700 h-12 flex-1 md:flex-none"
              >
                Export
              </Button>
            </div>
          </div>
        </div>
      </NextUINavbar>
      <Listbox aria-label="Todo list">
        {todos.map((todo) => (
          <ListboxItem key={todo.id} textValue={todo.text}>
            <div
              className="card p-4"
              style={{ backgroundColor: todo.completed ? "#333" : "" }}
            >
              <div
                style={{
                  textDecoration: todo.completed ? "line-through" : "none",
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
              color="danger"
              variant="light"
              onClick={() => setIsExportModalOpen(false)}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default TodoList;
