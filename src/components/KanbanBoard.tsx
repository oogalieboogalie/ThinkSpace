import React, { useState } from 'react';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { KanbanProvider, useKanban, Task } from '../contexts/KanbanContext';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import { createPortal } from 'react-dom';

const KanbanBoardContent: React.FC = () => {
    const { columns, tasks, moveTask } = useKanban();
    const [activeTask, setActiveTask] = useState<Task | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // Prevent accidental drags
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const onDragStart = (event: DragStartEvent) => {
        if (event.active.data.current?.type === 'Task') {
            setActiveTask(event.active.data.current.task);
        }
    };

    const onDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;
    };

    const onDragEnd = (event: DragEndEvent) => {
        setActiveTask(null);
        const { active, over } = event;

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        const activeTask = tasks.find((t) => t.id === activeId);
        if (!activeTask) return;

        // Dropped on a Column
        if (columns.some((col) => col.id === overId)) {
            if (activeTask.columnId !== overId) {
                moveTask(activeId, overId);
            }
            return;
        }

        // Dropped on another Task
        const overTask = tasks.find((t) => t.id === overId);
        if (overTask) {
            if (activeTask.columnId !== overTask.columnId) {
                moveTask(activeId, overTask.columnId);
            }
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
        >
            <div className="h-full flex gap-6 overflow-x-auto p-6 items-start">
                {columns.map((col) => (
                    <KanbanColumn
                        key={col.id}
                        column={col}
                        tasks={tasks.filter((t) => t.columnId === col.id)}
                    />
                ))}
            </div>

            {createPortal(
                <DragOverlay>
                    {activeTask && <KanbanCard task={activeTask} />}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    );
};

const KanbanBoard: React.FC = () => {
    return (
        <KanbanProvider>
            <div className="h-full flex flex-col bg-background/30">
                {/* Header */}
                <div className="p-6 pb-0">
                    <h1 className="text-2xl font-bold text-foreground">Project Board</h1>
                    <p className="text-muted-foreground">Manage your tasks and strategy</p>
                </div>
                <KanbanBoardContent />
            </div>
        </KanbanProvider>
    );
};

export default KanbanBoard;
