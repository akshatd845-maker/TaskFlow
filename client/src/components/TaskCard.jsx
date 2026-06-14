import { Draggable } from '@hello-pangea/dnd';

const TaskCard = ({ task, card, index, onClick, onEdit, onDelete }) => {
  const item = task || card;
  if (!item) return null;
  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-600 border-gray-200',
      medium: 'bg-blue-100 text-blue-600 border-blue-200',
      high: 'bg-orange-100 text-orange-600 border-orange-200',
      urgent: 'bg-red-100 text-red-600 border-red-200'
    };
    return colors[priority] || colors.medium;
  };

  const getPriorityIcon = (priority) => {
    if (priority === 'urgent') {
      return (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      );
    }

    if (priority === 'high') {
      return (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
      );
    }

    return null;
  };

  const formatDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const now = new Date();
    const diff = d - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return { text: 'Overdue', color: 'text-red-500' };
    if (days === 0) return { text: 'Today', color: 'text-orange-500' };
    if (days === 1) return { text: 'Tomorrow', color: 'text-orange-500' };
    if (days <= 7) return { text: `${days} days`, color: 'text-gray-500' };
    return {
      text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      color: 'text-gray-500'
    };
  };

  const dueDateInfo = formatDate(item.dueDate);

  return (
    <Draggable draggableId={item._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick?.(item)}
          className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 mb-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${
            snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500 rotate-2' : ''
          }`}
        >
          {item.labels && item.labels.length > 0 && (
            <div className="flex gap-1 mb-2">
              {item.labels.map((label, idx) => (
                <span
                  key={idx}
                  className={`w-8 h-2 rounded-full ${
                    label === 'red'
                      ? 'bg-red-500'
                      : label === 'orange'
                        ? 'bg-orange-500'
                        : label === 'yellow'
                          ? 'bg-yellow-500'
                          : label === 'green'
                            ? 'bg-green-500'
                            : label === 'blue'
                              ? 'bg-blue-500'
                              : label === 'purple'
                                ? 'bg-purple-500'
                                : label === 'pink'
                                  ? 'bg-pink-500'
                                  : 'bg-gray-500'
                  }`}
                />
              ))}
            </div>
          )}

          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
            {item.title}
          </h4>

          {item.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">{item.description}</p>
          )}

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColor(
                  item.priority
                )} flex items-center gap-1`}
              >
                {getPriorityIcon(item.priority)}
                {item.priority}
              </span>
            </div>

            <div className="flex items-center justify-between">
              {dueDateInfo && (
                <span className={`text-xs ${dueDateInfo.color} flex items-center gap-1 mr-2`}>
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {dueDateInfo.text}
                </span>
              )}

              {item.assignedTo && item.assignedTo.length > 0 && (
                <div className="flex -space-x-1">
                  {item.assignedTo.slice(0, 3).map((user, idx) => (
                    <div
                      key={idx}
                      className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border border-white"
                      title={user.name}
                    >
                      <span className="text-white text-xs font-medium">
                        {user.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  ))}

                  {item.assignedTo.length > 3 && (
                    <div className="w-5 h-5 rounded-full bg-gray-400 flex items-center justify-center border border-white">
                      <span className="text-white text-xs">+{item.assignedTo.length - 3}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(item);
              }}
              className="flex-1 text-xs text-gray-400 hover:text-blue-600 py-1"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(item._id);
              }}
              className="text-xs text-gray-400 hover:text-red-600 py-1 px-2"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default TaskCard;

