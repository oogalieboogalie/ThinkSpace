import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface Task {
    id: string;
    content: string;
    columnId: string;
}

export interface Column {
    id: string;
    title: string;
}

interface KanbanContextType {
    columns: Column[];
    tasks: Task[];
    addTask: (columnId: string, content?: string) => void;
    moveTask: (taskId: string, newColumnId: string) => void;
    updateTask: (taskId: string, newContent: string) => void;
    deleteTask: (taskId: string) => void;
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

const KanbanContext = createContext<KanbanContextType | undefined>(undefined);

export const KanbanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [columns] = useState<Column[]>([
        { id: 'todo', title: 'To Do' },
        { id: 'in-progress', title: 'In Progress' },
        { id: 'done', title: 'Done' },
    ]);

    const [tasks, setTasks] = useState<Task[]>(() => {
        const saved = localStorage.getItem('kanban_tasks');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (error) {
                console.warn('Failed to parse saved kanban tasks, using defaults', error);
            }
        }
        return [
            { id: '1', content: 'Welcome to your board! ??', columnId: 'todo' },
            { id: '2', content: 'Drag me to "In Progress"', columnId: 'todo' },
            { id: '3', content: 'Click to edit me ??', columnId: 'in-progress' },
        ];
    });

    useEffect(() => {
        localStorage.setItem('kanban_tasks', JSON.stringify(tasks));
    }, [tasks]);

    const addTask = (columnId: string, content: string = 'New Task') => {
        const newTask: Task = {
            id: uuidv4(),
            content,
            columnId,
        };
        setTasks((prev) => [...prev, newTask]);
    };

    const moveTask = (taskId: string, newColumnId: string) => {
        setTasks((prev) =>
            prev.map((task) =>
                task.id === taskId ? { ...task, columnId: newColumnId } : task
            )
        );
    };

    const updateTask = (taskId: string, newContent: string) => {
        setTasks((prev) =>
            prev.map((task) =>
                task.id === taskId ? { ...task, content: newContent } : task
            )
        );
    };

    const deleteTask = (taskId: string) => {
        setTasks((prev) => prev.filter((task) => task.id !== taskId));
    };

    return (
        <KanbanContext.Provider
            value={{
                columns,
                tasks,
                addTask,
                moveTask,
                updateTask,
                deleteTask,
                setTasks,
            }}
        >
            {children}
        </KanbanContext.Provider>
    );
};

export const useKanban = () => {
    const context = useContext(KanbanContext);
    if (!context) {
        throw new Error('useKanban must be used within a KanbanProvider');
    }
    return context;
};
