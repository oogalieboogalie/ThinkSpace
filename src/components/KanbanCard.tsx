import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, useKanban } from '../contexts/KanbanContext';
import { Trash2, Edit2, Check, X } from 'lucide-react';

interface KanbanCardProps {
    task: Task;
}

const KanbanCard: React.FC<KanbanCardProps> = ({ task }) => {
    const { updateTask, deleteTask } = useKanban();
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(task.content);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id, data: { type: 'Task', task } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const handleSave = () => {
        if (editContent.trim()) {
            updateTask(task.id, editContent);
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditContent(task.content);
        setIsEditing(false);
    };

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="bg-background/50 p-4 rounded-lg border-2 border-primary/50 opacity-50 h-[100px]"
            />
        );
    }

    if (isEditing) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="bg-card p-3 rounded-lg border border-border shadow-sm"
            >
                <textarea
                    className="w-full bg-input text-foreground rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    autoFocus
                    rows={3}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSave();
                        }
                    }}
                />
                <div className="flex justify-end gap-2 mt-2">
                    <button
                        onClick={handleCancel}
                        className="p-1 hover:bg-red-500/10 text-red-400 rounded transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleSave}
                        className="p-1 hover:bg-green-500/10 text-green-400 rounded transition-colors"
                    >
                        <Check className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="bg-card p-4 rounded-lg border border-border shadow-sm hover:border-primary/50 group relative cursor-grab active:cursor-grabbing"
        >
            <p className="text-sm text-foreground whitespace-pre-wrap">{task.content}</p>

            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 hover:bg-primary/10 text-muted-foreground hover:text-primary rounded transition-colors"
                >
                    <Edit2 className="w-3 h-3" />
                </button>
                <button
                    onClick={() => deleteTask(task.id)}
                    className="p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded transition-colors"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
};

export default KanbanCard;
