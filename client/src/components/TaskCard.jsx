import { memo, useCallback } from 'react';
import { Draggable } from '@hello-pangea/dnd';

const PRIORITY_META = {
  low: {
    label: 'Low',
    dot: '#4ade80',
    bg: 'rgba(74,222,128,0.08)',
    border: 'rgba(74,222,128,0.18)',
    text: '#4ade80',
  },
  medium: {
    label: 'Medium',
    dot: '#89ceff',
    bg: 'rgba(137,206,255,0.08)',
    border: 'rgba(137,206,255,0.18)',
    text: '#89ceff',
  },
  high: {
    label: 'High',
    dot: '#ffb695',
    bg: 'rgba(255,182,149,0.08)',
    border: 'rgba(255,182,149,0.18)',
    text: '#ffb695',
  },
  urgent: {
    label: 'Urgent',
    dot: '#ffb4ab',
    bg: 'rgba(255,180,171,0.1)',
    border: 'rgba(255,180,171,0.22)',
    text: '#ffb4ab',
  },
};

const LABEL_COLORS = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
  blue: '#3b82f6',
  purple: '#a855f7',
  pink: '#ec4899',
};

const formatDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const diff = d - Date.now();
  const days = Math.ceil(diff / 86_400_000);
  if (days < 0) return { text: 'Overdue', color: '#ffb4ab' };
  if (days === 0) return { text: 'Today', color: '#ffb695' };
  if (days === 1) return { text: 'Tomorrow', color: '#ffb695' };
  if (days <= 7) return { text: `${days}d`, color: '#918fa1' };
  return {
    text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    color: '#918fa1'
  };
};

const TaskCard = memo(({ task, card, index, onClick, onEdit, onDelete }) => {
  const item = task || card;

  // Move hooks before early return to comply with rules of hooks
  const handleCardClick = useCallback(() => item && onClick?.(item), [onClick, item]);
  const handleEdit = useCallback((e) => { e.stopPropagation(); item && onEdit?.(item); }, [onEdit, item]);
  const handleDelete = useCallback((e) => { e.stopPropagation(); item && onDelete?.(item._id); }, [onDelete, item]);

  if (!item) return null;

  const dueDateInfo = formatDate(item.dueDate);
  const priority = PRIORITY_META[item.priority] || PRIORITY_META.medium;

  return (
    <Draggable draggableId={item._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={handleCardClick}
          className="task-card group"
          style={{
            ...provided.draggableProps.style,
            background: snapshot.isDragging
              ? 'rgba(79,70,229,0.18)'
              : 'rgba(31,31,40,0.55)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${snapshot.isDragging ? 'rgba(195,192,255,0.25)' : 'rgba(255,255,255,0.05)'}`,
            borderRadius: '12px',
            padding: '12px',
            marginBottom: '8px',
            cursor: 'grab',
            transition: 'background 0.2s, border-color 0.2s, box-shadow 0.2s, transform 0.15s',
            boxShadow: snapshot.isDragging
              ? '0 16px 48px rgba(79,70,229,0.35), 0 0 0 2px rgba(195,192,255,0.2)'
              : '0 4px 16px rgba(0,0,0,0.2)',
            transform: snapshot.isDragging ? 'rotate(1.5deg) scale(1.02)' : 'none',
          }}
        >
          {/* Color label strips */}
          {item.labels && item.labels.length > 0 && (
            <div className="flex gap-1 mb-2.5">
              {item.labels.map((label, idx) => (
                <span
                  key={idx}
                  className="h-1.5 rounded-full"
                  style={{
                    width: '28px',
                    background: LABEL_COLORS[label] || '#918fa1',
                    opacity: 0.8,
                  }}
                />
              ))}
            </div>
          )}

          {/* Title */}
          <h4
            className="text-[13px] font-semibold leading-snug line-clamp-2 mb-1.5"
            style={{ color: '#e4e1ee', fontFamily: 'Inter, sans-serif' }}
          >
            {item.title}
          </h4>

          {/* Description */}
          {item.description && (
            <p
              className="text-[11.5px] leading-relaxed line-clamp-2 mb-2.5"
              style={{ color: '#918fa1', fontFamily: 'Inter, sans-serif' }}
            >
              {item.description}
            </p>
          )}

          {/* Footer row */}
          <div
            className="flex items-center justify-between pt-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
          >
            {/* Priority badge */}
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
              style={{
                background: priority.bg,
                border: `1px solid ${priority.border}`,
                color: priority.text,
                fontFamily: 'Geist, monospace',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: priority.dot }}
              />
              {priority.label}
            </span>

            <div className="flex items-center gap-2">
              {/* Due date */}
              {dueDateInfo && (
                <span
                  className="flex items-center gap-1 text-[11px]"
                  style={{ color: dueDateInfo.color, fontFamily: 'Geist, monospace' }}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {dueDateInfo.text}
                </span>
              )}

              {/* Assignee avatars */}
              {item.assignedTo && item.assignedTo.length > 0 && (
                <div className="flex -space-x-1">
                  {item.assignedTo.slice(0, 3).map((u, idx) => (
                    <div
                      key={idx}
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                      title={u.name}
                      style={{
                        background: 'linear-gradient(135deg, #4f46e5, #c3c0ff)',
                        color: '#1d00a5',
                        border: '1.5px solid rgba(19,18,27,0.8)',
                      }}
                    >
                      {u.name?.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {item.assignedTo.length > 3 && (
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        color: '#918fa1',
                        border: '1.5px solid rgba(19,18,27,0.8)',
                      }}
                    >
                      +{item.assignedTo.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons — visible on hover */}
          <div
            className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          >
            <button
              onClick={handleEdit}
              className="flex-1 text-[11px] py-1 rounded-lg transition-all duration-150 font-medium"
              style={{ color: '#89ceff', background: 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(137,206,255,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              Edit
            </button>
            <div style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.06)' }} />
            <button
              onClick={handleDelete}
              className="px-3 text-[11px] py-1 rounded-lg transition-all duration-150 font-medium"
              style={{ color: '#ffb4ab', background: 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,180,171,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </Draggable>
  );
});

TaskCard.displayName = 'TaskCard';
export default TaskCard;
