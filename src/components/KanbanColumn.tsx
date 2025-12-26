import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Column, Task, useKanban } from '../contexts/KanbanContext';
import KanbanCard from './KanbanCard';
import { Plus } from 'lucide-react';

interface KanbanColumnProps {
    column: Column;
    tasks: Task[];
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ column, tasks }) => {
    const { setNodeRef } = useDroppable({
        id: column.id,
        data: { type: 'Column', column },
    });

    const { addTask } = useKanban();

    return (
        <div className="flex flex-col w-80 h-full max-h-full bg-card/50 rounded-xl border border-border/50 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="p-4 border-b border-border/50 flex justify-between items-center bg-card/80 backdrop-blur-sm">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                    {column.title}
                </h3>
                <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full font-mono font-bold">
                    {tasks.length}
                </span>
            </div>

            {/* Task List */}
            <div
                ref={setNodeRef}
                className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar min-h-[100px]"
            >
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {tasks.map((task) => (
                        <KanbanCard key={task.id} task={task} />
                    ))}
                </SortableContext>
            </div>

            {/* Footer / Add Button */}
            <div className="p-3 border-t border-border/50 bg-card/30 backdrop-blur-sm">
                <button
                    onClick={() => addTask(column.id)}
                    className="w-full flex items-center justify-center gap-2 p-2 rounded-lg
            hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-200
            border border-dashed border-border hover:border-primary/30 text-sm font-medium group"
                >
                    <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    Add Task
                </button>
            </div>
        </div>
    );
};

export default KanbanColumn;
