import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { boardAPI, listAPI, cardAPI } from '../services/api';
import CommentSection from '../components/comments/CommentSection';
import KanbanBoard from '../components/KanbanBoard';

const Board = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddList, setShowAddList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [addingList, setAddingList] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [newCard, setNewCard] = useState({ title: '', description: '', priority: 'medium' });
  const [creatingCard, setCreatingCard] = useState(false);
  const [listIdForCard, setListIdForCard] = useState(null);

  useEffect(() => {
    fetchBoard();
  }, [id]);

  const fetchBoard = async () => {
    try {
      const response = await boardAPI.getOne(id);
      setBoard(response.data);
    } catch (err) {
      console.error('Error fetching board:', err);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleAddList = async (e) => {
    e.preventDefault();
    setAddingList(true);

    try {
      const response = await listAPI.create({
        name: newListName,
        boardId: id
      });
      setBoard({
        ...board,
        lists: [...(board.lists || []), response.data]
      });
      setNewListName('');
      setShowAddList(false);
    } catch (err) {
      console.error('Error creating list:', err);
    } finally {
      setAddingList(false);
    }
  };

  const handleDeleteList = async (listId) => {
    if (!window.confirm('Are you sure you want to delete this list and all its cards?')) {
      return;
    }

    try {
      await listAPI.delete(listId);
      setBoard({
        ...board,
        lists: board.lists.filter(l => l._id !== listId)
      });
    } catch (err) {
      console.error('Error deleting list:', err);
    }
  };

  const handleAddCard = (listId) => {
    setListIdForCard(listId);
    setNewCard({ title: '', description: '', priority: 'medium' });
    setShowCardModal(true);
  };

  const handleCreateCard = async (e) => {
    e.preventDefault();
    setCreatingCard(true);

    try {
      const response = await cardAPI.create({
        ...newCard,
        listId: listIdForCard
      });

      const updatedLists = board.lists.map(list => {
        if (list._id === listIdForCard) {
          return { ...list, cards: [...(list.cards || []), response.data] };
        }
        return list;
      });

      setBoard({ ...board, lists: updatedLists });
      setShowCardModal(false);
      setNewCard({ title: '', description: '', priority: 'medium' });
    } catch (err) {
      console.error('Error creating card:', err);
    } finally {
      setCreatingCard(false);
    }
  };

  const handleCardClick = (card) => {
    setSelectedCard(card);
    setShowCardModal(true);
  };

  const handleDeleteCard = async (cardId) => {
    if (!window.confirm('Are you sure you want to delete this card?')) {
      return;
    }

    try {
      await cardAPI.delete(cardId);

      const updatedLists = board.lists.map(list => ({
        ...list,
        cards: list.cards.filter(c => c._id !== cardId)
      }));

      setBoard({ ...board, lists: updatedLists });
      setShowCardModal(false);
    } catch (err) {
      console.error('Error deleting card:', err);
    }
  };

  const handleUpdateCard = async (cardId, data) => {
    try {
      const response = await cardAPI.update(cardId, data);

      const updatedLists = board.lists.map(list => ({
        ...list,
        cards: list.cards.map(c => c._id === cardId ? response.data : c)
      }));

      setBoard({ ...board, lists: updatedLists });
      setSelectedCard(response.data);
    } catch (err) {
      console.error('Error updating card:', err);
    }
  };

  const handleMoveCard = async (cardId, targetListId) => {
    try {
      const response = await cardAPI.move(cardId, { listId: targetListId });

      // Remove from old list and add to new list
      const updatedLists = board.lists.map(list => {
        if (list._id === targetListId) {
          return { ...list, cards: [...(list.cards || []), response.data] };
        }
        return { ...list, cards: list.cards.filter(c => c._id !== cardId) };
      });

      setBoard({ ...board, lists: updatedLists });
    } catch (err) {
      console.error('Error moving card:', err);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-600',
      medium: 'bg-blue-100 text-blue-600',
      high: 'bg-orange-100 text-orange-600',
      urgent: 'bg-red-100 text-red-600'
    };
    return colors[priority] || colors.medium;
  };

  const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p>Board not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: board.background || '#6366f1' }}>
      {/* Header */}
      <header className="bg-white bg-opacity-10 backdrop-blur-sm">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center space-x-4">
              <Link
                to="/dashboard"
                className="text-white hover:bg-white hover:bg-opacity-10 p-2 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-white font-semibold text-lg">{board.name}</h1>
              <span className="text-white text-opacity-60 text-sm">
                {board.lists?.length || 0} lists
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex -space-x-2">
                {board.members?.slice(0, 4).map((member) => (
                  <div
                    key={member.user?._id}
                    className="w-7 h-7 rounded-full bg-white flex items-center justify-center border-2 border-white"
                  >
                    <span className="text-xs font-medium text-gray-600">
                      {member.user?.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Board Content */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <div className="flex h-full space-x-4">
          <KanbanBoard
            board={board}
            setBoard={setBoard}
            onCardClick={handleCardClick}
            onAddCard={handleAddCard}
            onDeleteList={handleDeleteList}
            onEditCard={handleCardClick}
            onDeleteCard={handleDeleteCard}
          />

          {/* Add List Button */}
          <div className="flex-shrink-0 w-72">
            {showAddList ? (
              <form onSubmit={handleAddList} className="bg-gray-100 rounded-xl p-3">
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="Enter list title..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={addingList}
                    className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {addingList ? 'Adding...' : 'Add List'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddList(false)}
                    className="text-gray-500 hover:text-gray-700 p-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowAddList(true)}
                className="w-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-xl flex items-center gap-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add another list
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Card Modal */}
      {showCardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {selectedCard ? (
              <CardDetail
                card={selectedCard}
                lists={board.lists}
                onClose={() => { setShowCardModal(false); setSelectedCard(null); }}
                onUpdate={handleUpdateCard}
                onDelete={handleDeleteCard}
                onMove={handleMoveCard}
              />
            ) : (
              <form onSubmit={handleCreateCard} className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Card</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={newCard.title}
                      onChange={(e) => setNewCard({ ...newCard, title: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter card title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={newCard.description}
                      onChange={(e) => setNewCard({ ...newCard, description: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={3}
                      placeholder="Add a more detailed description..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={newCard.priority}
                      onChange={(e) => setNewCard({ ...newCard, priority: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-4 mt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowCardModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingCard}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {creatingCard ? 'Creating...' : 'Create Card'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Card Detail Component
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

export default Board;