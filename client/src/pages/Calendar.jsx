import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { cardAPI } from '../services/api';

const Calendar = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(dayjs().startOf('month'));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await cardAPI.getAll({ limit: 100, sort: 'duedate' });
        const withDue = (res.data.data || []).filter((c) => c.dueDate);
        setCards(withDue);
      } catch (e) {
        setError(e?.response?.data?.message || 'Failed to load calendar');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const daysInMonth = month.daysInMonth();
  const startOffset = month.startOf('month').day();

  const cardsByDate = useMemo(() => {
    const map = new Map();
    for (const card of cards) {
      const key = dayjs(card.dueDate).format('YYYY-MM-DD');
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(card);
    }
    return map;
  }, [cards]);

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Calendar</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Tasks with due dates across your boards.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMonth((m) => m.subtract(1, 'month'))}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:text-gray-200"
          >
            Prev
          </button>
          <span className="font-medium text-gray-900 dark:text-gray-100 min-w-[140px] text-center">
            {month.format('MMMM YYYY')}
          </span>
          <button
            type="button"
            onClick={() => setMonth((m) => m.add(1, 'month'))}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:text-gray-200"
          >
            Next
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 dark:bg-red-950/30 dark:border-red-900 dark:text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-900/50 text-xs font-semibold text-gray-500 dark:text-gray-400">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="p-3 text-center border-b border-gray-200 dark:border-gray-700">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="min-h-[100px] border-b border-r border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20" />;
              }
              const dateKey = month.date(day).format('YYYY-MM-DD');
              const dayCards = cardsByDate.get(dateKey) || [];
              const isToday = dateKey === dayjs().format('YYYY-MM-DD');

              return (
                <div
                  key={dateKey}
                  className={`min-h-[100px] p-2 border-b border-r border-gray-100 dark:border-gray-700 ${
                    isToday ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                  }`}
                >
                  <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700 dark:text-gray-300'}`}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayCards.slice(0, 3).map((card) => (
                      <div
                        key={card._id}
                        className="text-xs truncate px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
                        title={card.title}
                      >
                        {card.title}
                      </div>
                    ))}
                    {dayCards.length > 3 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">+{dayCards.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
