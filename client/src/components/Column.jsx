import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard';

// H7 FIX: Accept onEditCard and onDeleteCard props and pass them down to TaskCard
const Column = ({ list, onCardClick, onAddCard, onDeleteList, onEditCard, onDeleteCard }) => {
  return (
    <div className="flex-shrink-0 w-72 bg-gray-100 dark:bg-gray-700 rounded-xl flex flex-col max-h-full">
      <div className="p-3 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">{list.name}</h3>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400 dark:text-gray-400 mr-1">
            {(list.cards || []).length}
          </span>
          <button
            onClick={() => onDeleteList?.(list._id)}
            className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
            title="Delete list"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <Droppable droppableId={list._id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 overflow-y-auto p-2 space-y-2 min-h-[8px] ${
              snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''
            }`}
          >
            {(list.cards || []).sort((a, b) => a.position - b.position).map((card, index) => (
              <TaskCard
                key={card._id}
                task={card}
                index={index}
                onClick={onCardClick}
                onEdit={onEditCard}
                onDelete={onDeleteCard}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <div className="p-2">
        <button
          onClick={() => onAddCard?.(list._id)}
          className="w-full text-left text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 p-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add a card
        </button>
      </div>
    </div>
  );
};

export default Column;
