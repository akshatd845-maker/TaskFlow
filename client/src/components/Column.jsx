import { memo } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard';

const COLUMN_ACCENT = {
  'To Do':       { color: '#918fa1', glow: 'rgba(145,143,161,0.15)' },
  'In Progress': { color: '#89ceff', glow: 'rgba(137,206,255,0.15)' },
  'In Review':   { color: '#ffb695', glow: 'rgba(255,182,149,0.15)' },
  'Done':        { color: '#4ade80', glow: 'rgba(74,222,128,0.15)' },
};

const getAccent = (name) => COLUMN_ACCENT[name] || { color: '#c3c0ff', glow: 'rgba(195,192,255,0.15)' };

const Column = memo(({ list, onCardClick, onAddCard, onDeleteList, onEditCard, onDeleteCard }) => {
  const accent = getAccent(list.name);
  const cardCount = (list.cards || []).length;

  return (
    <div
      className="flex-shrink-0 flex flex-col"
      style={{
        width: '288px',
        background: 'rgba(19,18,27,0.4)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '16px',
        maxHeight: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Column header */}
      <div
        className="flex items-center justify-between px-4 py-3.5 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div className="flex items-center gap-2.5">
          {/* Accent dot */}
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: accent.color, boxShadow: `0 0 6px ${accent.glow}` }}
          />
          <h3
            className="text-[13px] font-semibold tracking-tight"
            style={{ color: '#e4e1ee', fontFamily: 'Inter, sans-serif' }}
          >
            {list.name}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Card count badge */}
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: '#918fa1',
              fontFamily: 'Geist, monospace',
            }}
          >
            {cardCount}
          </span>

          {/* Delete column */}
          <button
            onClick={() => onDeleteList?.(list._id)}
            title="Delete column"
            className="p-1 rounded-lg transition-all duration-150"
            style={{ color: '#464555' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ffb4ab'; e.currentTarget.style.background = 'rgba(255,180,171,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#464555'; e.currentTarget.style.background = 'transparent'; }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Cards droppable area */}
      <Droppable droppableId={list._id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex-1 overflow-y-auto px-3 py-3"
            style={{
              minHeight: '80px',
              background: snapshot.isDraggingOver
                ? `linear-gradient(180deg, rgba(79,70,229,0.06) 0%, transparent 100%)`
                : 'transparent',
              transition: 'background 0.2s ease',
            }}
          >
            {[...(list.cards || [])]
              .sort((a, b) => a.position - b.position)
              .map((card, index) => (
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

      {/* Add card footer */}
      <div className="px-3 pb-3 flex-shrink-0">
        <button
          onClick={() => onAddCard?.(list._id)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[12.5px] font-medium transition-all duration-200"
          style={{ color: '#464555', background: 'transparent' }}
          onMouseEnter={e => {
            e.currentTarget.style.color = accent.color;
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = '#464555';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Add a card
        </button>
      </div>
    </div>
  );
});

Column.displayName = 'Column';
export default Column;
