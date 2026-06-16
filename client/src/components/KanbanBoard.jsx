import { useEffect, useCallback, memo } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import Column from './Column';
import { cardAPI } from '../services/api';
import socket, { joinBoard, leaveBoard } from '../services/socket';

const listIdFromRef = (ref) => {
  if (!ref) return null;
  if (typeof ref === 'string') return ref;
  return ref._id?.toString() || ref.toString();
};

const KanbanBoard = memo(({ board, setBoard, onCardClick, onAddCard, onDeleteList, onEditCard, onDeleteCard }) => {
  useEffect(() => {
    if (!board) return;
    joinBoard(board._id);

    const onCardCreated = (card) => {
      setBoard((prev) => {
        if (!prev) return prev;
        const cardListId = listIdFromRef(card.list);
        const lists = prev.lists.map((l) => {
          if (l._id === cardListId) {
            // Check if card already exists to prevent duplicates
            const existingCards = l.cards || [];
            if (existingCards.some((c) => c._id === card._id)) {
              return l;
            }
            return { ...l, cards: [...existingCards, card] };
          }
          return l;
        });
        return { ...prev, lists };
      });
    };

    const onCardUpdated = (card) => {
      setBoard((prev) => {
        if (!prev) return prev;
        const lists = prev.lists.map((list) => ({
          ...list,
          cards: (list.cards || []).map((c) => (c._id === card._id ? card : c))
        }));
        return { ...prev, lists };
      });
    };

    const onCardDeleted = ({ cardId, listId }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        const lists = prev.lists.map((l) =>
          l._id === listId.toString()
            ? { ...l, cards: (l.cards || []).filter((c) => c._id !== cardId) }
            : l
        );
        return { ...prev, lists };
      });
    };

    const onCardMoved = ({ card, fromList, toList, position }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        // First pass: strip the card from every list (handles both the source
        // list and the case where an optimistic update already placed it in
        // the destination list, which would otherwise cause a duplicate).
        const stripped = prev.lists.map((l) => ({
          ...l,
          cards: (l.cards || []).filter((c) => c._id !== card._id),
        }));
        // Second pass: insert the card at the correct position in the target list.
        const lists = stripped.map((l) => {
          if (l._id === toList.toString()) {
            const newCards = Array.from(l.cards);
            newCards.splice(position, 0, card);
            return { ...l, cards: newCards };
          }
          return l;
        });
        return { ...prev, lists };
      });
    };

    socket.on('cardCreated', onCardCreated);
    socket.on('cardUpdated', onCardUpdated);
    socket.on('cardDeleted', onCardDeleted);
    socket.on('cardMoved', onCardMoved);

    return () => {
      leaveBoard(board._id);
      socket.off('cardCreated', onCardCreated);
      socket.off('cardUpdated', onCardUpdated);
      socket.off('cardDeleted', onCardDeleted);
      socket.off('cardMoved', onCardMoved);
    };
  }, [board?._id, setBoard]);

  const onDragEnd = useCallback(async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const startId = source.droppableId;
    const endId = destination.droppableId;
    let previousBoard = null;

    setBoard((prev) => {
      if (!prev) return prev;
      previousBoard = prev; // Capture state before modification
      const lists = prev.lists.map((list) => ({ ...list, cards: Array.from(list.cards || []) }));

      const sourceList = lists.find((l) => l._id === startId);
      const destList = lists.find((l) => l._id === endId);
      if (!sourceList || !destList) return prev;

      const [moved] = sourceList.cards.splice(source.index, 1);
      destList.cards.splice(destination.index, 0, moved);

      return { ...prev, lists };
    });

    try {
      await cardAPI.move(draggableId, { listId: endId, position: destination.index });
    } catch (err) {
      console.error('Error moving card', err);
      if (previousBoard) {
        setBoard(previousBoard);
      }
    }
  }, [setBoard]);

  return (
    <div className="flex h-full space-x-4">
      <DragDropContext onDragEnd={onDragEnd}>
        {[...(board.lists || [])].sort((a, b) => a.position - b.position).map((list) => (
          <Column
            key={list._id}
            list={list}
            onCardClick={onCardClick}
            onAddCard={onAddCard}
            onDeleteList={onDeleteList}
            onEditCard={onEditCard}
            onDeleteCard={onDeleteCard}
          />
        ))}
      </DragDropContext>
    </div>
  );
});

export default KanbanBoard;
