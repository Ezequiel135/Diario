import React, { useState, useEffect, useMemo } from 'react';
import { diaryService } from './services/db';
import { Entry, AppSettings, AppView } from './types';
import { EntryEditor } from './components/EntryEditor';
import { StatsView } from './components/StatsView';
import { CalendarView } from './components/CalendarView';
import { 
  Book, Plus, Settings, Lock, Search, 
  LayoutGrid, List, Sun, Moon, LogOut, Download, Upload, Star, Calendar as CalendarIcon, 
  Eye, EyeOff, Bell, Mic, X, CheckCircle, AlertCircle
} from './components/Icons';

// --- Toast Component ---
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}
const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bg = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  const icon = type === 'success' ? <CheckCircle size={18} /> : type === 'error' ? <AlertCircle size={18} /> : <Bell size={18} />;

  return (
    <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg shadow-black/10 text-white ${bg} animate-fade-in-up backdrop-blur-md`}>
      {icon}
      <span className="font-medium text-sm">{message}</span>
      <button onClick={onClose} className="opacity-80 hover:opacity-100"><X size={16} /></button>
    </div>
  );
};

function App() {
  // Global State
  const [entries, setEntries] = useState<Entry[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'|'info'} | null>(null);
  
  // Navigation State
  const [view, setView] = useState<AppView>('home');
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  // Security State
  const [isLocked, setIsLocked] = useState(true);
  const [pinInput, setPinInput] = useState('');
  const [lockError, setLockError] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showPinOnSettings, setShowPinOnSettings] = useState(false);
  const [shakeLock, setShakeLock] = useState(false);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMood, setFilterMood] = useState<string>('');
  const [selectedDateFilter, setSelectedDateFilter] = useState<number | null>(null);
  
  // Initialization
  useEffect(() => {
    const init = async () => {
      try {
        const loadedEntries = await diaryService.getAllEntries();
        const loadedSettings = await diaryService.getSettings();
        
        setEntries(loadedEntries);
        setSettings(loadedSettings);
        
        // Apply theme
        if (loadedSettings.theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }

        // Check Lock
        if (!loadedSettings.securityEnabled) {
          setIsLocked(false);
        }

        // Notification Permission
        if ('Notification' in window && Notification.permission === 'default') {
           Notification.requestPermission();
        }

        // Simple Daily Reminder Check
        if (loadedSettings.dailyReminder && 'Notification' in window && Notification.permission === 'granted') {
           const todayStr = new Date().toDateString();
           const hasEntryToday = loadedEntries.some(e => new Date(e.date).toDateString() === todayStr);
           if (!hasEntryToday) {
             // In a real PWA we would use a Service Worker.
           }
        }

      } catch (err) {
        console.error("Failed to load data", err);
        showToast("Erro ao carregar dados", 'error');
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const showToast = (msg: string, type: 'success'|'error'|'info' = 'info') => {
    setToast({ msg, type });
  };

  // Filter Logic
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // Security Filter
      if (entry.isPrivate && view !== 'editor' && !settings?.securityEnabled) {
          // If security disabled, show everything. If enabled, lock screen handles it.
      }
      
      const matchesSearch = 
        entry.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesMood = filterMood ? entry.mood === filterMood : true;
      const matchesView = view === 'favorites' ? entry.isFavorite : true;
      
      const matchesDate = selectedDateFilter 
        ? new Date(entry.date).toDateString() === new Date(selectedDateFilter).toDateString()
        : true;

      return matchesSearch && matchesMood && matchesView && matchesDate;
    });
  }, [entries, searchTerm, filterMood, view, settings, selectedDateFilter]);

  // Actions
  const handleSaveEntry = async (entry: Entry) => {
    await diaryService.saveEntry(entry);
    const updatedEntries = await diaryService.getAllEntries();
    setEntries(updatedEntries);
    setView('home');
    setEditingEntry(null);
    showToast("Entrada salva com sucesso!", 'success');
  };

  const handleDeleteEntry = async (id: string) => {
    if (window.confirm('Tem certeza que deseja apagar esta entrada?')) {
      await diaryService.deleteEntry(id);
      setEntries(prev => prev.filter(e => e.id !== id));
      if (view === 'editor') {
        setView('home');
        setEditingEntry(null);
      }
      showToast("Entrada removida", 'info');
    }
  };

  const handleCreateNew = () => {
    setEditingEntry(null);
    setView('editor');
  };

  const handleEdit = (entry: Entry) => {
    setEditingEntry(entry);
    setView('editor');
  };

  const handleUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (settings?.pin === pinInput) {
      setIsLocked(false);
      setLockError('');
      setPinInput('');
    } else {
      setLockError('PIN Incorreto');
      setShakeLock(true);
      setTimeout(() => setShakeLock(false), 500);
      setPinInput('');
    }
  };

  const toggleTheme = () => {
    const newTheme = settings?.theme === 'light' ? 'dark' : 'light';
    const newSettings = { ...settings!, theme: newTheme };
    setSettings(newSettings);
    diaryService.saveSettings(newSettings);
    document.documentElement.classList.toggle('dark');
  };

  const handleExport = async () => {
    const data = await diaryService.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-diario-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    showToast("Backup baixado!", 'success');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
       try {
         await diaryService.importData(event.target?.result as string);
         const loaded = await diaryService.getAllEntries();
         setEntries(loaded);
         showToast("Backup restaurado!", 'success');
       } catch (err) {
         showToast("Arquivo inválido", 'error');
       }
    };
    reader.readAsText(file);
  };

  const updateSettings = async (partial: Partial<AppSettings>) => {
    if (!settings) return;
    const updated = { ...settings, ...partial };
    setSettings(updated);
    await diaryService.saveSettings(updated);
  };

  // --- Views ---

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mb-4"></div>
        <div className="text-brand-600 font-medium animate-pulse">Carregando memórias...</div>
      </div>
    );
  }

  // Lock Screen
  if (isLocked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="absolute inset-0 bg-cover bg-center opacity-10 dark:opacity-20" style={{backgroundImage: 'url("https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?q=80&w=2835&auto=format&fit=crop")'}}></div>
        <div className={`relative glass-card p-10 rounded-3xl shadow-2xl w-full max-w-sm text-center mx-4 ${shakeLock ? 'animate-shake' : ''}`}>
          <div className="bg-gradient-to-tr from-brand-500 to-purple-600 p-5 rounded-2xl inline-block mb-6 shadow-lg shadow-brand-500/30">
            <Lock size={40} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">Bem-vindo de volta</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">Sua privacidade é nossa prioridade</p>
          
          <form onSubmit={handleUnlock} className="space-y-6">
            <div className="relative">
              <input 
                type={showPin ? "text" : "password"}
                value={pinInput} 
                onChange={(e) => setPinInput(e.target.value)} 
                className="w-full text-center text-3xl tracking-[0.5em] bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 focus:ring-2 focus:ring-brand-500 outline-none transition-all text-gray-800 dark:text-white font-mono placeholder:tracking-normal"
                placeholder="••••"
                maxLength={6}
                autoFocus
              />
              <button 
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-500 transition-colors"
              >
                {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            
            {lockError && <p className="text-red-500 text-sm font-medium animate-fade-in-up bg-red-50 dark:bg-red-900/20 py-1 rounded-lg">{lockError}</p>}
            
            <button 
              type="submit"
              className="w-full bg-gradient-to-r from-brand-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-brand-500/25 transition-all transform hover:scale-[1.02] active:scale-95"
            >
              Desbloquear
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main App
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-72 glass border-r dark:border-gray-800 z-10 transition-colors duration-300">
        <div className="p-8">
          <div className="flex items-center gap-3 text-brand-600 dark:text-brand-400">
            <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg">
               <Book size={24} />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-purple-600 dark:from-brand-400 dark:to-purple-400">
              Diário
            </h1>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          {[
            { id: 'home', icon: Book, label: 'Entradas' },
            { id: 'favorites', icon: Star, label: 'Favoritos' },
            { id: 'calendar', icon: CalendarIcon, label: 'Calendário' },
            { id: 'stats', icon: LayoutGrid, label: 'Estatísticas' },
            { id: 'settings', icon: Settings, label: 'Ajustes' },
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => { setView(item.id as AppView); if(item.id === 'home') { setFilterMood(''); setSelectedDateFilter(null); } }} 
              className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all duration-200 font-medium group ${view === item.id ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/25' : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm'}`}
            >
              <item.icon size={20} className={view === item.id ? 'text-white' : 'group-hover:text-brand-500 transition-colors'} /> 
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-6 mt-auto">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 border border-indigo-100 dark:border-gray-700">
             <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-200 mb-3">Sua jornada hoje</p>
             <button onClick={handleCreateNew} className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-xl shadow-lg flex justify-center items-center gap-2 font-bold text-sm transition-all transform hover:scale-[1.02]">
               <Plus size={18} /> Escrever Agora
             </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50 dark:bg-gray-900/50">
        
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 glass border-b dark:border-gray-800 sticky top-0 z-30 backdrop-blur-md">
           <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
             <Book size={24} />
             <span className="font-bold text-lg">Diário</span>
           </div>
           <button onClick={toggleTheme} className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
             {settings?.theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative no-scrollbar">
          
          {/* EDITOR OVERLAY */}
          {view === 'editor' ? (
             <div className="fixed inset-0 z-40 bg-gray-100/50 dark:bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-0 md:p-4 animate-fade-in">
               <div className="w-full h-full md:h-[95%] max-w-5xl bg-white dark:bg-gray-900 md:rounded-3xl shadow-2xl overflow-hidden flex flex-col relative animate-fade-in-up border dark:border-gray-700">
                 <EntryEditor 
                   key={editingEntry?.id || 'new'}
                   initialEntry={editingEntry} 
                   onSave={handleSaveEntry} 
                   onCancel={() => setView('home')}
                   onDelete={handleDeleteEntry}
                 />
               </div>
             </div>
          ) : view === 'stats' ? (
             <div className="max-w-6xl mx-auto">
               <StatsView entries={entries} />
             </div>
          ) : view === 'calendar' ? (
             <div className="max-w-6xl mx-auto">
                <CalendarView 
                  entries={entries} 
                  onSelectDate={(date) => {
                    setSelectedDateFilter(date);
                    if (date) setView('home'); 
                  }} 
                />
             </div>
          ) : view === 'settings' ? (
             <div className="max-w-3xl mx-auto space-y-8 animate-fade-in-up pb-24">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Configurações</h2>
                
                {/* Cards Container */}
                <div className="grid gap-6">
                  {/* Theme */}
                  <div className="glass-card p-6 rounded-2xl flex justify-between items-center group hover:shadow-md transition-shadow">
                     <div className="flex items-center gap-5">
                        <div className="p-4 bg-orange-100 dark:bg-orange-900/20 rounded-2xl text-orange-500 group-hover:scale-110 transition-transform">
                          {settings?.theme === 'light' ? <Sun size={24}/> : <Moon size={24}/>}
                        </div>
                        <div>
                          <p className="font-bold text-lg text-gray-800 dark:text-white">Aparência</p>
                          <p className="text-sm text-gray-500">Alternar entre modo Claro e Escuro</p>
                        </div>
                     </div>
                     <button onClick={toggleTheme} className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-semibold text-sm transition-colors">
                       {settings?.theme === 'light' ? 'Ativar Escuro' : 'Ativar Claro'}
                     </button>
                  </div>

                  {/* Security */}
                  <div className="glass-card p-6 rounded-2xl space-y-6">
                     <div className="flex items-center gap-5">
                        <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-2xl text-red-500">
                          <Lock size={24}/>
                        </div>
                        <h3 className="font-bold text-lg text-gray-800 dark:text-white">Privacidade e Segurança</h3>
                     </div>
                     
                     <div className="flex items-center justify-between py-2 border-b dark:border-gray-800">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">Bloqueio por PIN</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={settings?.securityEnabled || false} onChange={(e) => updateSettings({ securityEnabled: e.target.checked })} className="sr-only peer"/>
                          <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-brand-500"></div>
                        </label>
                     </div>
                     
                     {settings?.securityEnabled && (
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl space-y-3 animate-fade-in">
                          <label className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Definir PIN</label>
                          <div className="relative">
                            <input 
                              type={showPinOnSettings ? "text" : "password"}
                              placeholder="4-6 dígitos numéricos"
                              value={settings.pin || ''}
                              onChange={(e) => updateSettings({ pin: e.target.value })}
                              maxLength={6}
                              className="w-full p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all text-gray-900 dark:text-white text-lg tracking-widest"
                            />
                            <button 
                              type="button"
                              onClick={() => setShowPinOnSettings(!showPinOnSettings)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-500"
                            >
                              {showPinOnSettings ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                          </div>
                          <p className="text-xs text-orange-500 flex items-center gap-1">
                            <AlertCircle size={12}/> Importante: Não esqueça seu PIN. Não há recuperação de senha online.
                          </p>
                        </div>
                     )}
                  </div>

                  {/* Data */}
                  <div className="glass-card p-6 rounded-2xl space-y-6">
                     <div className="flex items-center gap-5">
                        <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-2xl text-green-600">
                          <Download size={24}/>
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-gray-800 dark:text-white">Dados e Backup</h3>
                          <p className="text-sm text-gray-500">Seus dados são salvos localmente neste dispositivo.</p>
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <button onClick={handleExport} className="flex items-center justify-center gap-2 p-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-brand-500 hover:text-brand-600 dark:hover:border-brand-500 transition-all group">
                          <Download size={20} className="group-hover:-translate-y-1 transition-transform" /> 
                          <span className="font-semibold">Exportar Backup</span>
                       </button>
                       <label className="flex items-center justify-center gap-2 p-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-brand-500 hover:text-brand-600 dark:hover:border-brand-500 transition-all group">
                          <Upload size={20} className="group-hover:-translate-y-1 transition-transform" /> 
                          <span className="font-semibold">Importar Backup</span>
                          <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                       </label>
                     </div>
                  </div>
                </div>
             </div>
          ) : (
            /* LIST VIEW (Home & Favorites) */
             <div className="max-w-5xl mx-auto pb-24 animate-fade-in">
                
                {/* Header Section */}
                <div className="mb-8 space-y-2">
                   <h2 className="text-3xl font-black text-gray-900 dark:text-white">
                     {view === 'favorites' ? 'Favoritos ⭐' : selectedDateFilter ? 'Arquivo' : 'Minhas Memórias'}
                   </h2>
                   <p className="text-gray-500 dark:text-gray-400">
                     {filteredEntries.length} {filteredEntries.length === 1 ? 'registro encontrado' : 'registros encontrados'}
                   </p>
                </div>

                {/* Search & Filters Bar */}
                <div className="sticky top-0 z-20 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-md py-4 -mx-4 px-4 md:mx-0 md:px-0 md:rounded-2xl md:static mb-6 space-y-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1 group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="text-gray-400 group-focus-within:text-brand-500 transition-colors" size={20} />
                      </div>
                      <input 
                        type="text" 
                        placeholder="Buscar em suas memórias..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-brand-500 outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 transition-shadow"
                      />
                    </div>
                    {/* Date Filter Tag */}
                    {selectedDateFilter && (
                      <div className="flex items-center bg-brand-500 text-white px-5 py-2 rounded-2xl shadow-lg shadow-brand-500/30 animate-fade-in-up">
                         <CalendarIcon size={18} className="mr-2"/>
                         <span className="font-medium">{new Date(selectedDateFilter).toLocaleDateString('pt-BR', {day: 'numeric', month: 'long'})}</span>
                         <button onClick={() => setSelectedDateFilter(null)} className="ml-3 p-1 hover:bg-white/20 rounded-full">
                           <X size={14}/>
                         </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Mood Filter Pills */}
                  <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                       {[{val: '', label: 'Tudo'}, {val: '😄', label: 'Feliz'}, {val: '😌', label: 'Calmo'}, {val: '😐', label: 'Neutro'}, {val: '😔', label: 'Triste'}, {val: '😠', label: 'Irritado'}].map(m => (
                         <button 
                           key={m.val || 'all'} 
                           onClick={() => setFilterMood(m.val)}
                           className={`px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all transform active:scale-95 ${filterMood === m.val ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'}`}
                         >
                           {m.val} {m.label}
                         </button>
                       ))}
                  </div>
                </div>

                {/* Empty State */}
                {filteredEntries.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up">
                    <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                       <Book size={40} className="text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">Nada por aqui ainda</h3>
                    <p className="text-gray-500 mb-8 max-w-xs mx-auto">Comece a escrever sua história hoje. Registre seus momentos.</p>
                    {!selectedDateFilter && (
                      <button onClick={handleCreateNew} className="px-8 py-3 bg-brand-600 text-white rounded-full font-bold shadow-lg shadow-brand-600/30 hover:shadow-brand-600/50 transition-all hover:-translate-y-1">
                        Criar Primeira Entrada
                      </button>
                    )}
                  </div>
                )}

                {/* Entry Masonry Grid */}
                <div className="columns-1 md:columns-2 gap-6 space-y-6">
                  {filteredEntries.map((entry, idx) => (
                    <div 
                      key={entry.id} 
                      onClick={() => handleEdit(entry)}
                      style={{ animationDelay: `${idx * 50}ms` }}
                      className="break-inside-avoid group bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-brand-500/10 transition-all duration-300 cursor-pointer border border-gray-100 dark:border-gray-700/50 relative overflow-hidden animate-fade-in-up"
                    >
                       <div className="flex justify-between items-start mb-4">
                          <span className="text-3xl filter drop-shadow-sm group-hover:scale-110 transition-transform duration-300">{entry.mood}</span>
                          <div className="flex gap-2">
                             {entry.isFavorite && <Star size={18} className="text-yellow-400 fill-yellow-400 drop-shadow-sm" />}
                             {entry.isPrivate && <Lock size={18} className="text-amber-500" />}
                          </div>
                       </div>

                       <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-2 leading-snug group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                         {entry.title || "Sem título"}
                       </h3>
                       
                       <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
                          <CalendarIcon size={12}/>
                          {new Date(entry.date).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'long' })}
                       </div>

                       {entry.images.length > 0 && (
                          <div className="mb-4 rounded-2xl overflow-hidden aspect-video relative">
                            <img src={entry.images[0]} alt="" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" />
                            {entry.images.length > 1 && (
                               <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg backdrop-blur-md">
                                 +{entry.images.length - 1}
                               </div>
                            )}
                          </div>
                       )}

                       <p className="text-gray-600 dark:text-gray-300 line-clamp-4 text-sm leading-relaxed mb-4 font-medium opacity-90">
                         {entry.content}
                       </p>

                       <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-700">
                          <div className="flex flex-wrap gap-1">
                            {entry.tags.slice(0,2).map(t => (
                              <span key={t} className="text-[10px] font-bold px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md">#{t}</span>
                            ))}
                          </div>
                          <div className="flex gap-3 text-gray-400">
                             {entry.audio && <Mic size={16} className="text-brand-400"/>}
                             {entry.drawing && <div className="w-4 h-4 rounded-full bg-indigo-400" title="Desenho"></div>}
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
             </div>
          )}
        </div>

        {/* Mobile Dock Navigation */}
        <div className="md:hidden fixed bottom-4 left-4 right-4 bg-gray-900/90 dark:bg-gray-800/90 backdrop-blur-xl text-white rounded-3xl p-2 z-40 shadow-2xl flex justify-between items-center px-6 border border-white/10">
          <button onClick={() => setView('home')} className={`p-3 rounded-2xl transition-all ${view === 'home' ? 'bg-white/20 text-white' : 'text-gray-400'}`}>
            <List size={24} />
          </button>
          <button onClick={() => setView('calendar')} className={`p-3 rounded-2xl transition-all ${view === 'calendar' ? 'bg-white/20 text-white' : 'text-gray-400'}`}>
             <CalendarIcon size={24} />
          </button>
          <button onClick={handleCreateNew} className="p-4 bg-brand-500 rounded-2xl shadow-lg shadow-brand-500/50 -translate-y-6 border-4 border-gray-50 dark:border-gray-900 transform active:scale-95 transition-transform">
             <Plus size={28} color="white" />
          </button>
          <button onClick={() => setView('stats')} className={`p-3 rounded-2xl transition-all ${view === 'stats' ? 'bg-white/20 text-white' : 'text-gray-400'}`}>
             <LayoutGrid size={24} />
          </button>
          <button onClick={() => setView('settings')} className={`p-3 rounded-2xl transition-all ${view === 'settings' ? 'bg-white/20 text-white' : 'text-gray-400'}`}>
             <Settings size={24} />
          </button>
        </div>
      </main>
    </div>
  );
}

export default App;