import { useState } from 'react';
import CommentSection from './comments/CommentSection';

const CardDetail = ({ card, lists, onClose, onUpdate, onDelete, onMove }) => {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [priority, setPriority] = useState(card.priority);
  const [dueDate, setDueDate] = useState(card.dueDate ? card.dueDate.split('T')[0] : '');
  const [movingCard, setMovingCard] = useState(false);
  const [selectedListId, setSelectedListId] = useState('');

  const handleSave = () => {
    onUpdate(card._id, {
      title,
      description,
      priority,
      dueDate: dueDate || null
    });
  };

  const handleMove = () => {
    if (selectedListId) {
      onMove(card._id, selectedListId);
      onClose();
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSave}
            className="text-xl font-bold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 w-full"
          />
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleSave}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
              placeholder="Add a description..."
            />
          </div>

          {/* Comments */}
          <div>
            <CommentSection taskId={card._id} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => { setPriority(e.target.value); setTimeout(handleSave, 0); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => { setDueDate(e.target.value); setTimeout(handleSave, 0); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Move to List</label>
            {movingCard ? (
              <div className="space-y-2">
                <select
                  value={selectedListId}
                  onChange={(e) => setSelectedListId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a list</option>
                  {lists.map(list => (
                    <option key={list._id} value={list._id}>{list.name}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={handleMove}
                    disabled={!selectedListId}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Move
                  </button>
                  <button
                    onClick={() => setMovingCard(false)}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setMovingCard(true)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
              >
                Move card
              </button>
            )}
          </div>

          <button
            onClick={() => onDelete(card._id)}
            className="w-full px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
          >
            Delete Card
          </button>
        </div>
      </div>
    </div>
  );
};

export default CardDetail;
