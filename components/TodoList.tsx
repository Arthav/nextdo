import React, { useState, useEffect } from "react";
import { Button } from "@nextui-org/button";
import { Input } from "@nextui-org/input";
import { Listbox, ListboxItem } from "@nextui-org/listbox";
import { TrashIcon } from "@/components/icons";
import {Kbd} from "@nextui-org/kbd";
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

  return (
    <div>
      <div
        style={{ display: "flex", alignItems: "center", marginBottom: "2rem" }}
      >
        <Button
          size="sm"
          style={{
            marginRight: "1rem",
            height: "3rem",
            backgroundColor: "red",
            color: "white",
          }}
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
          style={{ width: "100%", borderRadius: "1rem", height: "3rem" }}
          fullWidth
          endContent={
            <Kbd keys={["ctrl", "enter"]}></Kbd>
          }
        />
        <Button
          style={{ marginLeft: "1rem", height: "3rem" }}
          onPress={addTask}
          aria-label="Add task"
        >
          Add Task
        </Button>
      </div>
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
    </div>
  );
};

export default TodoList;
