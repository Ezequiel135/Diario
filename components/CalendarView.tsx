import React, { useState, useMemo } from 'react';
import { Entry } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarViewProps {
  entries: Entry[];
  onSelectDate: (dateTimestamp: number | null) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ entries, onSelectDate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday

  const entriesByDay = useMemo(() => {
    const map = new Map<number, Entry[]>();
    entries.forEach(entry => {
      const d = new Date(entry.date);
      if (d.getMonth() === month && d.getFullYear() === year) {
        const day = d.getDate();
        if (!map.has(day)) map.set(day, []);
        map.get(day)?.push(entry);
      }
    });
    return map;
  }, [entries, month, year]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
    onSelectDate(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
    onSelectDate(null);
  };

  const handleDayClick = (day: number) => {
    if (selectedDay === day) {
      setSelectedDay(null);
      onSelectDate(null);
    } else {
      setSelectedDay(day);
      const timestamp = new Date(year, month, day).getTime();
      onSelectDate(timestamp);
    }
  };

  return (
    <div className="animate-fade-in-up pb-20">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-black text-gray-800 dark:text-white capitalize tracking-tight">
          {currentDate.toLocaleString('pt-BR', { month: 'long' })} <span className="text-gray-400 font-light">{year}</span>
        </h2>
        <div className="flex gap-2">
          <button onClick={handlePrevMonth} className="p-3 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button onClick={handleNextMonth} className="p-3 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-4 mb-4">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
          <div key={day} className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-3">
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="h-32 rounded-3xl bg-transparent"></div>
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayEntries = entriesByDay.get(day) || [];
          const isSelected = selectedDay === day;
          const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

          return (
            <button
              key={day}
              onClick={() => handleDayClick(day)}
              className={`relative h-24 md:h-32 rounded-3xl p-3 text-left transition-all duration-300 group
                ${isSelected 
                  ? 'bg-brand-600 text-white shadow-xl shadow-brand-500/30 transform scale-105 z-10' 
                  : 'bg-white dark:bg-gray-800 hover:bg-white hover:shadow-lg dark:hover:bg-gray-700 border border-transparent hover:border-gray-100 dark:hover:border-gray-600'
                }
                ${isToday && !isSelected ? 'ring-2 ring-brand-400 bg-brand-50 dark:bg-brand-900/20' : ''}
              `}
            >
              <span className={`text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full mb-1
                ${isSelected ? 'bg-white/20' : isToday ? 'bg-brand-500 text-white' : 'text-gray-500 dark:text-gray-400 group-hover:bg-gray-100 dark:group-hover:bg-gray-600'}
              `}>
                {day}
              </span>

              <div className="flex flex-wrap gap-1 content-end overflow-hidden h-12 md:h-16">
                {dayEntries.slice(0, 5).map((entry) => (
                  <span key={entry.id} className="text-sm filter drop-shadow-sm transform hover:scale-125 transition-transform" title={entry.title}>
                    {entry.mood}
                  </span>
                ))}
                {dayEntries.length > 5 && (
                  <span className={`text-[10px] font-bold px-1 rounded ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>+</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};