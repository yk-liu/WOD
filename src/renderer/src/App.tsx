import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { AlertTriangle, Save, Clock, Skull, Play, Eye, EyeOff, Settings, X, Download } from 'lucide-react';

// --- UTILITIES ---

const STORAGE_KEY = 'type-or-die-cache-v1';
const PREFS_KEY = 'type-or-die-prefs-v1';

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// --- TYPES ---

type AppConfig = {
  targetMinutes: number;
  warnTime: number;
  wipeTime: number;
  theme: 'system' | 'light' | 'dark';
  fontFamily: string; 
  maxWidth: number;   
  fontSize: number;   
};

const DEFAULT_CONFIG: AppConfig = {
  targetMinutes: 25,
  warnTime: 5,
  wipeTime: 10,
  theme: 'system',
  fontFamily: "'Courier Prime', 'Courier New', monospace",
  maxWidth: 65,
  fontSize: 18,
};

// --- COMPONENTS ---

const ToastContainer = ({ toasts }: { toasts: any[] }) => (
  <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
    {toasts.map((t) => (
      <div
        key={t.id}
        className="bg-gray-800 text-white px-4 py-2 rounded shadow-lg text-sm animate-fade-in-down border-l-4 border-red-500"
      >
        {t.message}
      </div>
    ))}
  </div>
);

const SettingsModal = ({ 
  isOpen, 
  onClose, 
  config, 
  onSave 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  config: AppConfig; 
  onSave: (c: AppConfig) => void 
}) => {
  const [localConfig, setLocalConfig] = useState(config);

  useEffect(() => {
    if (isOpen) setLocalConfig(config);
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleChange = (field: keyof AppConfig, value: any) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Preferences</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="space-y-6">
           {/* Visual Settings */}
           <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2 flex justify-between">
              <span>Editor Width</span>
              <span>{localConfig.maxWidth}ch</span>
            </label>
            <input 
              type="range" 
              min="30" 
              max="120" 
              value={localConfig.maxWidth}
              onChange={(e) => handleChange('maxWidth', parseInt(e.target.value))}
              className="w-full accent-red-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2 flex justify-between">
               <span>Font Size</span>
               <span>{localConfig.fontSize}px</span>
            </label>
            <input 
              type="range" 
              min="12" 
              max="32" 
              value={localConfig.fontSize}
              onChange={(e) => handleChange('fontSize', parseInt(e.target.value))}
              className="w-full accent-red-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Font Family</label>
            <input 
              type="text" 
              value={localConfig.fontFamily}
              onChange={(e) => handleChange('fontFamily', e.target.value)}
              placeholder="e.g. Helvetica, Arial, sans-serif"
              className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded font-mono text-sm"
            />
          </div>
          
          <hr className="border-gray-200 dark:border-gray-700" />

          {/* Defaults */}
          <div>
             <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Default Target (Mins)</label>
             <input 
               type="number" 
               value={localConfig.targetMinutes}
               onChange={(e) => handleChange('targetMinutes', parseInt(e.target.value))}
               className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
             />
          </div>
        </div>

        <button 
          onClick={handleSave}
          className="mt-6 w-full bg-black dark:bg-white text-white dark:text-black font-bold py-3 rounded hover:opacity-90"
        >
          Save Defaults
        </button>
      </div>
    </div>
  );
};

// --- MAIN APP ---

export default function App() {
  const [appState, setAppState] = useState('config'); 
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  
  const [text, setText] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [lastTypeTime, setLastTypeTime] = useState(Date.now());
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [toasts, setToasts] = useState<any[]>([]);
  const [hasStartedTyping, setHasStartedTyping] = useState(false);
  const [isAutoSavedPostTarget, setIsAutoSavedPostTarget] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const textEndRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number | null>(null);
  const textRef = useRef(text);
  const prevTargetReachedRef = useRef(false);

  // -- INIT: Load Defaults & IPC Listeners --
  useEffect(() => {
    const saved = localStorage.getItem(PREFS_KEY);
    if (saved) {
      try {
        setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(saved) });
      } catch (e) { console.error('Failed to load prefs'); }
    }

    const handleOpenSettings = () => {
      setShowSettings(true);
    };

    if ((window as any).electron && (window as any).electron.ipcRenderer) {
      (window as any).electron.ipcRenderer.on('open-settings', handleOpenSettings);
    }

    return () => {
       if ((window as any).electron && (window as any).electron.ipcRenderer) {
         (window as any).electron.ipcRenderer.removeAllListeners('open-settings');
       }
    };
  }, []);

  const updateDefaults = (newConfig: AppConfig) => {
    setConfig(newConfig);
    localStorage.setItem(PREFS_KEY, JSON.stringify(newConfig));
  };

  // -- DERIVED STATE --
  const idleSeconds = (currentTime - lastTypeTime) / 1000;
  const isWarning = hasStartedTyping && appState === 'active' && idleSeconds > config.warnTime;
  const sessionSeconds = sessionStartTime ? (currentTime - sessionStartTime) / 1000 : 0;
  const targetSeconds = config.targetMinutes * 60;
  const targetReached = sessionSeconds >= targetSeconds;

  // -- SYNC REF --
  useEffect(() => { textRef.current = text; }, [text]);

  // -- EFFECT: THEME --
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    
    if (config.theme === 'system') {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.add('light');
      }
    } else {
      root.classList.add(config.theme);
    }
  }, [config.theme]);

  // -- EFFECT: GAME LOOP --
  useEffect(() => {
    if (appState !== 'active') return;
    const animate = () => {
      const now = Date.now();
      setCurrentTime(now);
      if (hasStartedTyping) {
        const currentIdle = (now - lastTypeTime) / 1000;
        if (currentIdle >= config.wipeTime) {
          failSession();
          return; 
        }
        const sSeconds = sessionStartTime ? (now - sessionStartTime) / 1000 : 0;
        const tSeconds = config.targetMinutes * 60;
        if (sSeconds >= tSeconds && currentIdle >= 10 && !isAutoSavedPostTarget) {
          saveToLocalStorage(text, true);
          addToast('Auto-saved (Target Reached)');
          setIsAutoSavedPostTarget(true); 
        }
      }
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => { if (requestRef.current !== null) cancelAnimationFrame(requestRef.current); };
  }, [appState, lastTypeTime, hasStartedTyping, config, sessionStartTime, text, isAutoSavedPostTarget]);

  // -- EFFECT: AUTO-SAVE --
  useEffect(() => {
    if (appState !== 'active' || !hasStartedTyping) return;
    const interval = window.setInterval(() => {
        saveToLocalStorage(textRef.current, false);
    }, 10000);
    return () => window.clearInterval(interval);
  }, [appState, hasStartedTyping, config]); 

  // -- EFFECT: AUTO-SAVE FILE ON TARGET REACHED --
  useEffect(() => {
    // Detect a rising edge: when targetReached changes from false -> true
    if (!prevTargetReachedRef.current && targetReached) {
      // Automatically trigger a file save once
      handleManualSave();
      addToast('Target reached – file auto-saved.');
    }
    prevTargetReachedRef.current = targetReached;
  }, [targetReached]);

  // -- SCROLLING --
  useLayoutEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [text, appState]);

  // -- HELPERS --
  const addToast = (message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const startSession = (newConfig: AppConfig) => {
    updateDefaults(newConfig);
    setAppState('active');
    setText('');
    setSessionStartTime(Date.now());
    setLastTypeTime(Date.now());
    setHasStartedTyping(false);
    setIsAutoSavedPostTarget(false);
  };

  const failSession = () => {
    setAppState('failed');
    setText(''); 
    localStorage.removeItem(STORAGE_KEY);
  };

  const saveToLocalStorage = (currentText: string, isTargetSave: boolean) => {
    const payload = { text: currentText, config, timestamp: Date.now(), isTargetSave };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  };

  const handleManualSave = () => {
    if (!targetReached) {
      const remaining = Math.ceil(targetSeconds - sessionSeconds);
      addToast(`Save blocked! Unlocks in ${formatTime(remaining)}`);
      return;
    }
    const blob = new Blob([text + '\n'], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date();
    const fmt = (n: number) => n.toString().padStart(2,'0');
    a.download = `type-or-die-${date.getFullYear()}-${fmt(date.getMonth()+1)}-${fmt(date.getDate())}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('File Saved successfully.');
  };

  // -- INPUT HANDLER --
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (appState === 'failed') {
        if (e.key === 'Escape') setAppState('config');
        return;
      }
      if (appState !== 'active') return;
      if (!hasStartedTyping && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        setHasStartedTyping(true);
        setSessionStartTime(Date.now());
        setLastTypeTime(Date.now());
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        addToast('NO PASTE ALLOWED');
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleManualSave();
        return;
      }
      const forbidden = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'];
      if (forbidden.includes(e.key)) { e.preventDefault(); return; }
      if (!e.ctrlKey && !e.altKey && !e.metaKey) {
        if (e.key.length === 1 || e.key === 'Enter') {
          e.preventDefault();
          setLastTypeTime(Date.now());
          setIsAutoSavedPostTarget(false);
          if (e.key === 'Enter') setText(prev => prev + '\n');
          else setText(prev => prev + e.key);
        }
      }
    };
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      addToast('NO PASTE ALLOWED');
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('paste', handlePaste, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('paste', handlePaste, { capture: true });
    };
  }, [appState, hasStartedTyping, targetReached, text, sessionSeconds, targetSeconds]);

  // --- RENDER CONFIG SCREEN ---

  if (appState === 'config') {
    return (
       <>
        <SettingsModal 
            isOpen={showSettings} 
            onClose={() => setShowSettings(false)} 
            config={config}
            onSave={updateDefaults}
        />
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono p-4 pt-8 md:pt-10 relative">
            <button 
                onClick={() => setShowSettings(true)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            >
                <Settings size={24} />
            </button>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700 text-center">
                <div className="flex items-center justify-center mb-6 text-red-600 dark:text-red-500"><Skull size={48} /></div>
                <h1 className="text-3xl font-bold mb-2 uppercase tracking-widest">Type or Die</h1>
                <p className="text-gray-500 text-sm mb-8">Strict Append-Only Mode</p>
                <button
                    onClick={() => startSession(config)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded shadow-lg transform transition hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                    <Play size={20} /> START SESSION
                </button>
                <div className="mt-4 text-xs text-gray-400">
                    {config.targetMinutes}m Target · {config.wipeTime}s Wipe
                </div>
            </div>
        </div>
       </>
    );
  }

  // --- RENDER ACTIVE APP ---

  let overlayOpacity = 0;
  if (isWarning) {
    const progress = (idleSeconds - config.warnTime) / (config.wipeTime - config.warnTime);
    overlayOpacity = Math.min(Math.max(progress, 0.2), 1); 
  }

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300 pt-6 md:pt-8"
         style={{ fontFamily: config.fontFamily }}>
      
      <ToastContainer toasts={toasts} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} config={config} onSave={updateDefaults} />

      {/* HEADER */}
      <div className={`flex items-center justify-between px-6 py-3 bg-gray-200 dark:bg-gray-800 shadow-sm z-20 transition-opacity duration-300 ${focusMode ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
        <div className="flex items-center gap-4 ml-16 md:ml-20">
          <div className={`flex items-center gap-2 font-bold ${targetReached ? 'text-green-600 dark:text-green-400' : ''}`}>
            <Clock size={18} />
            <span>{formatTime(sessionSeconds)} / {formatTime(targetSeconds)}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
           <div className="flex items-center gap-1"><AlertTriangle size={14} /> Warn: {config.warnTime}s</div>
           <div className="flex items-center gap-1"><Skull size={14} /> Wipe: {config.wipeTime}s</div>
        </div>

        <div className="flex items-center gap-4">
           {targetReached ? (
             <button 
               onClick={handleManualSave}
               className="text-green-500 flex items-center gap-1 text-sm animate-pulse hover:underline"
               title="Click to Save"
             >
               <Download size={16} /> Save Unlocked
             </button>
           ) : (
             <span className="text-gray-400 flex items-center gap-1 text-sm cursor-not-allowed">
               <Save size={16} /> Locked
             </span>
           )}
           <button onClick={() => setFocusMode(!focusMode)} className="p-1.5 rounded hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300" title="Focus Mode">
             {focusMode ? <EyeOff size={18} /> : <Eye size={18} />}
           </button>
           <button onClick={() => setShowSettings(true)} className="p-1.5 rounded hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300" title="Settings">
             <Settings size={18} />
           </button>
        </div>
      </div>

      {/* EDITOR */}
      <div className="relative flex-1 w-full overflow-hidden">
        <div ref={scrollContainerRef} className="absolute inset-0 overflow-y-hidden" style={{ scrollBehavior: 'smooth' }}>
          <div className="mx-auto min-h-full relative" style={{ paddingTop: '50vh', paddingBottom: '50vh', maxWidth: `${config.maxWidth}ch` }}>
            <div 
                ref={contentRef} 
                className="whitespace-pre-wrap break-words leading-relaxed outline-none"
                style={{ fontSize: `${config.fontSize}px` }}
            >
              {text}
              {appState === 'active' && <span className="inline-block w-3 h-[1.2em] bg-gray-800 dark:bg-gray-200 ml-1 align-middle animate-pulse"></span>}
            </div>
            <div ref={textEndRef} />
          </div>
        </div>

        <div className="absolute inset-0 bg-red-600 pointer-events-none z-30 mix-blend-multiply transition-opacity duration-100" 
          style={{ opacity: isWarning ? overlayOpacity * 0.6 : 0, animation: isWarning ? 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none' }} 
        />
        
        {appState === 'failed' && (
          <div className="absolute inset-0 bg-black z-40 flex flex-col items-center justify-center text-red-600 animate-in fade-in duration-300">
            <h1 className="text-9xl font-black tracking-tighter mb-4">FAILED</h1>
            <p className="text-white font-mono text-xl animate-bounce mt-8">Press <span className="border border-white px-2 py-1 rounded mx-1">Esc</span> to restart</p>
          </div>
        )}

        {!hasStartedTyping && appState === 'active' && !focusMode && (
           <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-400 text-sm animate-pulse">Start typing to begin...</div>
        )}
      </div>
    </div>
  );
}