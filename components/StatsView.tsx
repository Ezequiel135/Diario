import React from 'react';
import { Entry, MOODS } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface StatsViewProps {
  entries: Entry[];
}

const COLORS = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe', '#f5f3ff'];

export const StatsView: React.FC<StatsViewProps> = ({ entries }) => {
  // Calculate Mood Stats
  const moodCounts = entries.reduce((acc, entry) => {
    acc[entry.mood] = (acc[entry.mood] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const moodData = Object.entries(moodCounts).map(([emoji, count]: [string, number]) => {
     const moodDef = MOODS.find(m => m.emoji === emoji);
     return { name: moodDef?.label || emoji, value: count, emoji };
  }).sort((a,b) => b.value - a.value);

  // Calculate Entries per Month
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toLocaleString('pt-BR', { month: 'short' });
  }).reverse();

  const entriesPerMonth = last6Months.map(label => {
    return {
      name: label,
      count: entries.filter(e => new Date(e.date).toLocaleString('pt-BR', { month: 'short' }) === label).length
    };
  });

  return (
    <div className="space-y-8 animate-fade-in-up pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <h2 className="text-3xl font-black text-gray-800 dark:text-white tracking-tight">Insights</h2>
        <p className="text-gray-500">Analise seus padrões emocionais e de escrita.</p>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-violet-500 to-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-violet-500/20 transform hover:-translate-y-1 transition-transform">
          <p className="text-xs font-bold opacity-70 uppercase tracking-widest mb-1">Total</p>
          <p className="text-4xl font-black">{entries.length}</p>
          <p className="text-xs opacity-70 mt-2">Entradas registradas</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow">
           <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Favoritos</p>
           <p className="text-4xl font-black text-yellow-400">{entries.filter(e => e.isFavorite).length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow">
           <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Humor Top</p>
           <p className="text-4xl font-black">
               {moodData.length > 0 ? moodData[0].emoji : '-'}
           </p>
           <p className="text-xs text-gray-500 mt-2">{moodData.length > 0 ? moodData[0].name : ''}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow">
           <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Fotos</p>
           <p className="text-4xl font-black text-blue-400">{entries.filter(e => e.images.length > 0).length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Activity Chart */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">Frequência Mensal</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={entriesPerMonth}>
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', background: 'rgba(255,255,255,0.9)' }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 6, 6]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mood Distribution */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">Balanço Emocional</h3>
          <div className="h-72 flex items-center justify-center relative">
            {moodData.length > 0 ? (
               <>
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie
                       data={moodData}
                       cx="50%"
                       cy="50%"
                       innerRadius={80}
                       outerRadius={100}
                       paddingAngle={5}
                       dataKey="value"
                       cornerRadius={8}
                     >
                       {moodData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                       ))}
                     </Pie>
                     <Tooltip contentStyle={{ borderRadius: '12px' }} />
                   </PieChart>
                 </ResponsiveContainer>
                 {/* Center Content */}
                 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-4xl">{moodData[0].emoji}</span>
                    <span className="text-xs font-bold text-gray-400 mt-1">DOMINANTE</span>
                 </div>
               </>
            ) : (
                <p className="text-gray-400 font-medium">Sem dados suficientes ainda.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};