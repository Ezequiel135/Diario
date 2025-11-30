import React, { useState, useRef, useEffect } from 'react';
import { Entry, MOODS, CATEGORIES } from '../types';
import { Mic, MicOff, ImageIcon, PenTool, Save, X, Trash2, Lock, Unlock, Star, RefreshCcw, Calendar as CalendarIcon, ChevronLeft } from './Icons';
import { v4 as uuidv4 } from 'uuid';

interface EntryEditorProps {
  initialEntry?: Entry | null;
  onSave: (entry: Entry) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
}

// Helper for speech recognition types
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export const EntryEditor: React.FC<EntryEditorProps> = ({ initialEntry, onSave, onCancel, onDelete }) => {
  const [title, setTitle] = useState(initialEntry?.title || '');
  const [content, setContent] = useState(initialEntry?.content || '');
  const [mood, setMood] = useState(initialEntry?.mood || '😐');
  const [category, setCategory] = useState(initialEntry?.category || 'Pessoal');
  const [tags, setTags] = useState<string[]>(initialEntry?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [isFavorite, setIsFavorite] = useState(initialEntry?.isFavorite || false);
  const [isPrivate, setIsPrivate] = useState(initialEntry?.isPrivate || false);
  const [images, setImages] = useState<string[]>(initialEntry?.images || []);
  const [audio, setAudio] = useState<string | undefined>(initialEntry?.audio);
  const [drawing, setDrawing] = useState<string | undefined>(initialEntry?.drawing);
  
  // Media Recorder State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Speech to Text State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Drawing State
  const [showCanvas, setShowCanvas] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize canvas when shown
  useEffect(() => {
    if (showCanvas && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#000';
        
        // If editing existing drawing, load it
        if (drawing) {
           const img = new Image();
           img.src = drawing;
           img.onload = () => ctx.drawImage(img, 0, 0);
        }
      }
    }
  }, [showCanvas, drawing]);

  const initSpeechRecognition = () => {
    if (recognitionRef.current) return recognitionRef.current;

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setContent(prev => {
             const needsSpace = prev.length > 0 && !prev.endsWith(' ') && !prev.endsWith('\n');
             return prev + (needsSpace ? ' ' : '') + finalTranscript;
          });
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
           setIsListening(false);
           alert("Permissão de microfone negada. Habilite nas configurações do navegador.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      return recognition;
    }
    return null;
  };

  const toggleSpeechRecognition = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      const recognition = initSpeechRecognition();
      if (recognition) {
        try {
           recognition.start();
           setIsListening(true);
        } catch(e) {
           console.error("Failed to start recognition", e);
           setIsListening(false);
        }
      } else {
        alert("Navegador sem suporte a voz.");
      }
    }
  };

  const handleSave = () => {
    if (!title.trim() && !content.trim()) {
      alert("Adicione um título ou conteúdo antes de salvar.");
      return;
    }

    const entry: Entry = {
      id: initialEntry?.id || uuidv4(),
      title: title || 'Sem título',
      content,
      date: initialEntry?.date || Date.now(),
      updatedAt: Date.now(),
      mood,
      category,
      tags,
      isFavorite,
      isPrivate,
      images,
      audio,
      drawing,
    };
    onSave(entry);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { 
         alert("Imagem muito grande (Max 5MB).");
         return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setAudio(reader.result as string);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert('Permissão de microfone negada.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Drawing Logic
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };
  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      setDrawing(canvasRef.current.toDataURL());
    }
  };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    let x, y;
    if ('touches' in e) {
       x = e.touches[0].clientX - rect.left;
       y = e.touches[0].clientY - rect.top;
    } else {
       x = (e as React.MouseEvent).clientX - rect.left;
       y = (e as React.MouseEvent).clientY - rect.top;
    }

    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag.trim()) {
      if (!tags.includes(newTag.trim())) {
        setTags([...tags, newTag.trim()]);
      }
      setNewTag('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 md:bg-gray-50/50 md:dark:bg-gray-900/50">
      
      {/* Top Toolbar */}
      <div className="flex justify-between items-center p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-20 border-b border-gray-100 dark:border-gray-800">
        <button onClick={onCancel} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors flex items-center gap-1">
          <ChevronLeft size={24} />
          <span className="font-medium hidden sm:inline">Voltar</span>
        </button>
        
        <div className="flex items-center gap-2">
          {initialEntry && onDelete && (
             <button onClick={() => onDelete(initialEntry.id)} className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors" title="Excluir">
                <Trash2 size={20} />
             </button>
          )}
          
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2"></div>
          
          <button 
            onClick={() => setIsPrivate(!isPrivate)} 
            className={`p-2.5 rounded-full transition-all ${isPrivate ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            {isPrivate ? <Lock size={20} /> : <Unlock size={20} />}
          </button>
          
          <button 
            onClick={() => setIsFavorite(!isFavorite)} 
            className={`p-2.5 rounded-full transition-all ${isFavorite ? 'bg-yellow-100 text-yellow-500 dark:bg-yellow-900/30' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            <Star size={20} fill={isFavorite ? "currentColor" : "none"} />
          </button>

          <button 
            onClick={handleSave} 
            className="ml-2 flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-full font-bold shadow-lg shadow-brand-500/30 transition-all transform active:scale-95 hover:scale-105"
          >
            <Save size={18} />
            <span className="hidden sm:inline">Salvar</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
         <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-8">
            
            {/* Header Inputs */}
            <div className="space-y-4 animate-fade-in-up">
               <div className="flex items-center gap-2 text-sm font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 w-fit px-3 py-1 rounded-full">
                  <CalendarIcon size={14} />
                  {new Date(initialEntry?.date || Date.now()).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
               </div>
               
               <input 
                 type="text" 
                 value={title}
                 onChange={(e) => setTitle(e.target.value)}
                 placeholder="Dê um título ao seu dia..."
                 className="w-full text-4xl md:text-5xl font-black bg-transparent border-none outline-none placeholder-gray-300 dark:placeholder-gray-700 text-gray-900 dark:text-white leading-tight"
               />
            </div>

            {/* Mood Selector */}
            <div className="animate-fade-in-up" style={{animationDelay: '100ms'}}>
              <div className="flex gap-4 items-center overflow-x-auto no-scrollbar py-2">
                {MOODS.map((m) => (
                  <button
                    key={m.label}
                    onClick={() => setMood(m.emoji)}
                    className={`flex flex-col items-center justify-center min-w-[4rem] h-20 rounded-2xl transition-all duration-300 ${mood === m.emoji ? 'bg-brand-600 text-white scale-110 shadow-xl shadow-brand-500/20' : 'bg-white dark:bg-gray-800 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:scale-105 border border-gray-100 dark:border-gray-800'}`}
                  >
                    <span className="text-3xl mb-1 filter drop-shadow-sm">{m.emoji}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Text Editor */}
            <div className="relative group animate-fade-in-up" style={{animationDelay: '200ms'}}>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Como foi seu dia? Conte tudo..."
                className="w-full min-h-[400px] p-0 resize-none bg-transparent border-none outline-none text-xl leading-relaxed text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-700 empty-content"
              />
              
              {/* Floating Action Button for Speech */}
              <button 
                onClick={toggleSpeechRecognition}
                className={`absolute bottom-0 right-0 p-4 rounded-full shadow-2xl transition-all transform hover:scale-110 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white dark:bg-gray-800 text-brand-500 hover:text-brand-600 border border-gray-100 dark:border-gray-700'}`}
                title="Digitação por voz"
              >
                {isListening ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
            </div>

            {/* Attachments Section */}
            <div className="space-y-6 pt-6 border-t border-dashed border-gray-200 dark:border-gray-800 animate-fade-in-up" style={{animationDelay: '300ms'}}>
               <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Anexos</h3>
               
               {/* Media Toolbar */}
               <div className="flex flex-wrap gap-3">
                   <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageUpload} />
                   <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-5 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors font-medium">
                     <ImageIcon size={18} /> Adicionar Foto
                   </button>

                   <button onClick={isRecording ? stopRecording : startRecording} className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all font-medium ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-300 hover:bg-rose-100'}`}>
                     {isRecording ? <MicOff size={18} /> : <Mic size={18} />} {isRecording ? 'Gravando...' : 'Gravar Áudio'}
                   </button>

                   <button onClick={() => setShowCanvas(!showCanvas)} className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all font-medium ${showCanvas ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100'}`}>
                     <PenTool size={18} /> {showCanvas ? 'Fechar Quadro' : 'Desenhar'}
                   </button>
               </div>

               {/* Gallery */}
               {images.length > 0 && (
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                   {images.map((img, idx) => (
                     <div key={idx} className="relative group rounded-2xl overflow-hidden aspect-square shadow-sm">
                       <img src={img} alt="" className="w-full h-full object-cover" />
                       <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <button onClick={() => setImages(images.filter((_, i) => i !== idx))} className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-red-500 transition-colors"><Trash2 size={20}/></button>
                       </div>
                     </div>
                   ))}
                 </div>
               )}

               {/* Audio Player */}
               {audio && (
                  <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                     <div className="p-3 bg-rose-500 rounded-full text-white shadow-lg shadow-rose-500/30"><Mic size={20}/></div>
                     <audio controls src={audio} className="w-full h-8" />
                     <button onClick={() => setAudio(undefined)} className="text-gray-400 hover:text-red-500"><X size={20}/></button>
                  </div>
               )}

               {/* Drawing Canvas */}
               {(showCanvas || drawing) && (
                  <div className="bg-white p-2 rounded-2xl shadow-inner border dark:border-gray-700">
                     {showCanvas ? (
                        <div className="relative">
                           <canvas 
                             ref={canvasRef}
                             width={window.innerWidth > 800 ? 700 : window.innerWidth - 60}
                             height={400}
                             className="bg-white rounded-xl cursor-crosshair border border-gray-100 touch-none mx-auto w-full"
                             onMouseDown={startDrawing}
                             onMouseUp={stopDrawing}
                             onMouseLeave={stopDrawing}
                             onMouseMove={draw}
                             onTouchStart={startDrawing}
                             onTouchEnd={stopDrawing}
                             onTouchMove={draw}
                           />
                           <button onClick={() => { const ctx = canvasRef.current?.getContext('2d'); if(ctx) ctx.clearRect(0,0,1000,1000); }} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900"><RefreshCcw size={16}/></button>
                        </div>
                     ) : (
                        drawing && (
                           <div className="relative group">
                              <img src={drawing} className="w-full rounded-xl bg-white" />
                              <button onClick={() => setDrawing(undefined)} className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={18}/></button>
                           </div>
                        )
                     )}
                  </div>
               )}
            </div>

            {/* Footer Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-800/40 p-6 rounded-3xl animate-fade-in-up" style={{animationDelay: '400ms'}}>
               <div className="space-y-2">
                 <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Categoria</label>
                 <select 
                   value={category} 
                   onChange={(e) => setCategory(e.target.value)}
                   className="w-full p-4 bg-white dark:bg-gray-800 rounded-xl border-none shadow-sm focus:ring-2 focus:ring-brand-500 outline-none"
                 >
                   {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tags</label>
                 <div className="flex flex-wrap gap-2 min-h-[50px] bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm">
                    {tags.map(t => (
                      <span key={t} className="px-3 py-1 bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-300 text-sm font-bold rounded-lg flex items-center gap-1">
                        #{t} <button onClick={() => setTags(tags.filter(tag => tag !== t))} className="hover:text-brand-800"><X size={12}/></button>
                      </span>
                    ))}
                    <input 
                      type="text" 
                      value={newTag} 
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={addTag}
                      placeholder="Nova tag..."
                      className="bg-transparent outline-none text-sm min-w-[80px] flex-1"
                    />
                 </div>
               </div>
            </div>

            <div className="h-10"></div> {/* Spacer */}
         </div>
      </div>
    </div>
  );
};