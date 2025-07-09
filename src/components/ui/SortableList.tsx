import React, { useState, useRef } from 'react';

interface SortableListProps {
  children: React.ReactElement[];
  onReorder: (startIndex: number, endIndex: number) => void;
}

interface SortableItemProps {
  children: React.ReactNode;
  id: string;
}

export function SortableList({ children, onReorder }: SortableListProps) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const dragCounter = useRef(0);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItem(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', id);
  };

  const handleDragEnter = (_e: React.DragEvent, id: string) => {
    dragCounter.current++;
    if (draggedItem && draggedItem !== id) {
      setDragOverItem(id);
    }
  };

  const handleDragLeave = (_e: React.DragEvent) => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverItem(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropId: string) => {
    e.preventDefault();
    dragCounter.current = 0;
    
    if (draggedItem && draggedItem !== dropId) {
      const draggedIndex = children.findIndex((child: any) => child.props.id === draggedItem);
      const dropIndex = children.findIndex((child: any) => child.props.id === dropId);
      
      if (draggedIndex !== -1 && dropIndex !== -1) {
        onReorder(draggedIndex, dropIndex);
      }
    }
    
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
    dragCounter.current = 0;
  };

  return (
    <div className="space-y-2">
      {children.map((child) => {
        const id = (child as any).props.id;
        const isDragging = draggedItem === id;
        const isDragOver = dragOverItem === id;
        
        return (
          <div
            key={id}
            draggable
            onDragStart={(e) => handleDragStart(e, id)}
            onDragEnter={(e) => handleDragEnter(e, id)}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, id)}
            onDragEnd={handleDragEnd}
            className={`
              transition-all duration-200 cursor-move
              ${isDragging ? 'opacity-50 scale-95' : ''}
              ${isDragOver ? 'border-primary border-2' : ''}
            `}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
}

export function SortableItem({ children, id }: SortableItemProps) {
  return (
    <div
      className="bg-card border border-border rounded-lg p-4 mb-2 hover:shadow-sm transition-shadow"
      data-id={id}
    >
      {children}
    </div>
  );
}
