import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { AlertTriangle, Save, Clock, Settings, Skull, Play, Download, Eye, EyeOff } from 'lucide-react';

// --- UTILITIES ---

const STORAGE_KEY = 'type-or-die-cache-v1';

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// --- COMPONENTS ---

// 1. Toast System
const ToastContainer = ({ toasts }) => (
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

// 2. Configuration Screen
const ConfigScreen = ({ onStart, initialConfig }) => {
  const [config, setConfig] = useState(initialConfig);
  const [error, setError] = useState('');

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (parseInt(config.wipeTime) < parseInt(config.warnTime)) {
      setError('Wipe time must be greater than or equal to Warn time.');
      return;
    }
    onStart(config);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center mb-6 text-red-600 dark:text-red-500">
          <Skull size={48} />
        </div>
        <h1 className="text-3xl font-bold text-center mb-2 uppercase tracking-widest">Type or Die</h1>
        <p className="text-center text-gray-500 text-sm mb-8">Append-only. Don't stop writing.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold mb-2">Target Time (Minutes)</label>
            <input
              type="number"
              min="1"
              value={config.targetMinutes}
              onChange={(e) => handleChange('targetMinutes', parseInt(e.target.value))}
              className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">Warn Idle (s)</label>
              <input
                type="number"
                min="1"
                value={config.warnTime}
                onChange={(e) => handleChange('warnTime', parseInt(e.target.value))}
                className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Wipe Idle (s)</label>
              <input
                type="number"
                min="1"
                value={config.wipeTime}
                onChange={(e) => handleChange('wipeTime', parseInt(e.target.value))}
                className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
              />
            </div>
          </div>
          
          {error && <p className="text-red-500 text-xs font-bold">{error}</p>}

          <div>
            <label className="block text-sm font-bold mb-2">Theme</label>
            <div className="flex bg-gray-50 dark:bg-gray-700 rounded p-1 border border-gray-300 dark:border-gray-600">
              {['system', 'light', 'dark'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleChange('theme', t)}
                  className={`flex-1 py-2 text-sm capitalize rounded ${config.theme === t ? 'bg-white dark:bg-gray-600 shadow text-black dark:text-white font-bold' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded shadow-lg transform transition hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            <Play size={20} /> ENTER THE VOID
          </button>
        </form>
      </div>
    </div>
  );
};

// --- MAIN APP ---

export default function App() {
  // -- STATE --
  const [appState, setAppState] = useState('config'); // config, active, failed
  const [config, setConfig] = useState({
    targetMinutes: 25,
    warnTime: 5,
    wipeTime: 10,
    theme: 'system',
  });
  
  const [text, setText] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [lastTypeTime, setLastTypeTime] = useState(Date.now());
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [toasts, setToasts] = useState([]);
  const [hasStartedTyping, setHasStartedTyping] = useState(false);
  const [isAutoSavedPostTarget, setIsAutoSavedPostTarget] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  // Refs for DOM manipulation and intervals
  const scrollContainerRef = useRef(null);
  const contentRef = useRef(null);
  const textEndRef = useRef(null);
  const requestRef = useRef();
  
  // -- DERIVED STATE --
  const idleSeconds = (currentTime - lastTypeTime) / 1000;
  const isWarning = hasStartedTyping && appState === 'active' && idleSeconds > config.warnTime;
  const sessionSeconds = sessionStartTime ? (currentTime - sessionStartTime) / 1000 : 0;
  const targetSeconds = config.targetMinutes * 60;
  const targetReached = sessionSeconds >= targetSeconds;

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

  // -- EFFECT: GAME LOOP & TIMERS --
  useEffect(() => {
    if (appState !== 'active') return;

    const animate = () => {
      const now = Date.now();
      setCurrentTime(now);

      // Check Wipe Condition
      if (hasStartedTyping) {
        const currentIdle = (now - lastTypeTime) / 1000;
        if (currentIdle >= config.wipeTime) {
          failSession();
          return; // Stop loop
        }

        // Check Auto-save after target logic
        const sSeconds = (now - sessionStartTime) / 1000;
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
    return () => cancelAnimationFrame(requestRef.current);
  }, [appState, lastTypeTime, hasStartedTyping, config, sessionStartTime, text, isAutoSavedPostTarget]);

  // -- EFFECT: PERIODIC AUTO-SAVE (Every 10s while typing) --
  useEffect(() => {
    if (appState !== 'active' || !hasStartedTyping) return;
    
    const interval = setInterval(() => {
        saveToLocalStorage(text, false);
    }, 10000);

    return () => clearInterval(interval);
  }, [appState, hasStartedTyping, text]);

  // -- SCROLLING LOGIC (Typewriter Center) --
  useLayoutEffect(() => {
    if (scrollContainerRef.current && contentRef.current) {
      // Force the scroll to follow the bottom.
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [text, appState]);

  // -- HELPERS --

  const addToast = (message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const startSession = (newConfig) => {
    setConfig(newConfig);
    setAppState('active');
    setText('');
    setSessionStartTime(Date.now());
    setLastTypeTime(Date.now());
    setHasStartedTyping(false);
    setIsAutoSavedPostTarget(false);
  };

  const failSession = () => {
    setAppState('failed');
    setText(''); // WIPE
    localStorage.removeItem(STORAGE_KEY); // Clear cache
  };

  const saveToLocalStorage = (currentText, isTargetSave) => {
    const payload = {
      text: currentText,
      config,
      timestamp: Date.now(),
      isTargetSave
    };
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
    const fmt = (n) => n.toString().padStart(2,'0');
    const filename = `type-or-die-${date.getFullYear()}-${fmt(date.getMonth()+1)}-${fmt(date.getDate())}-${fmt(date.getHours())}-${fmt(date.getMinutes())}-${fmt(date.getSeconds())}.txt`;
    
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('File Saved successfully.');
  };

  // -- INPUT HANDLER --

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (appState === 'failed') {
        if (e.key === 'Escape') {
          setAppState('config');
        }
        return;
      }

      if (appState !== 'active') return;

      // Start session on first key
      if (!hasStartedTyping && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        setHasStartedTyping(true);
        setSessionStartTime(Date.now());
        setLastTypeTime(Date.now());
      }

      // Block Paste
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        addToast('NO PASTE ALLOWED');
        return;
      }

      // Manual Save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleManualSave();
        return;
      }

      // Block Forbidden Keys
      const forbidden = [
        'Backspace', 'Delete', 
        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
        'Home', 'End', 'PageUp', 'PageDown'
      ];

      if (forbidden.includes(e.key)) {
        e.preventDefault();
        return; // STRICTLY IGNORE
      }

      // Handle Typing
      if (!e.ctrlKey && !e.altKey && !e.metaKey) {
        if (e.key.length === 1 || e.key === 'Enter') {
          e.preventDefault();
          
          setLastTypeTime(Date.now());
          setIsAutoSavedPostTarget(false);

          if (e.key === 'Enter') {
            setText(prev => prev + '\n');
          } else {
            setText(prev => prev + e.key);
          }
        }
      }
    };

    const handlePaste = (e) => {
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


  // --- RENDER ---

  if (appState === 'config') {
    return <ConfigScreen initialConfig={config} onStart={startSession} />;
  }

  let overlayOpacity = 0;
  if (isWarning) {
    const progress = (idleSeconds - config.warnTime) / (config.wipeTime - config.warnTime);
    overlayOpacity = Math.min(Math.max(progress, 0.2), 1); 
  }

  return (
    <div className={`relative w-full h-screen overflow-hidden font-mono flex flex-col
      bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300`}>
      
      <ToastContainer toasts={toasts} />

      {/* STATUS BAR */}
      <div className={`flex items-center justify-between px-6 py-3 bg-gray-200 dark:bg-gray-800 shadow-sm z-20 transition-opacity duration-300 ${focusMode ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 font-bold ${targetReached ? 'text-green-600 dark:text-green-400' : ''}`}>
            <Clock size={18} />
            <span>
              {formatTime(sessionSeconds)} / {formatTime(targetSeconds)}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-6 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
           <div className="flex items-center gap-1">
             <AlertTriangle size={14} />
             Warn: {config.warnTime}s
           </div>
           <div className="flex items-center gap-1">
             <Skull size={14} />
             Wipe: {config.wipeTime}s
           </div>
        </div>

        <div className="flex items-center gap-4">
           {targetReached ? (
             <span className="text-green-500 flex items-center gap-1 text-sm animate-pulse">
               <Save size={16} /> Save Unlocked
             </span>
           ) : (
             <span className="text-gray-400 flex items-center gap-1 text-sm">
               <Save size={16} /> Locked
             </span>
           )}
           <button 
            onClick={() => setFocusMode(!focusMode)}
            className="p-1.5 rounded hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
            title="Toggle Focus Mode"
           >
             {focusMode ? <EyeOff size={18} /> : <Eye size={18} />}
           </button>
        </div>
      </div>

      {/* WRITING AREA */}
      <div className="relative flex-1 w-full overflow-hidden">
        
        {/* Scroll Container */}
        <div 
          ref={scrollContainerRef}
          className="absolute inset-0 overflow-y-hidden" 
          style={{ scrollBehavior: 'smooth' }}
        >
          <div 
            className="max-w-[65ch] mx-auto min-h-full relative"
            style={{ 
              paddingTop: '50vh',
              paddingBottom: '50vh'
            }}
          >
            <div 
              ref={contentRef}
              className="whitespace-pre-wrap break-words text-lg md:text-xl leading-relaxed outline-none"
            >
              {text}
              {appState === 'active' && (
                <span className="inline-block w-3 h-6 bg-gray-800 dark:bg-gray-200 ml-1 align-middle animate-pulse"></span>
              )}
            </div>
            <div ref={textEndRef} />
          </div>
        </div>

        {/* Warning Overlay */}
        <div 
          className="absolute inset-0 bg-red-600 pointer-events-none z-30 mix-blend-multiply transition-opacity duration-100"
          style={{ 
            opacity: isWarning ? overlayOpacity * 0.6 : 0,
            animation: isWarning ? 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
          }}
        />
        
        {/* FAILED STATE OVERLAY */}
        {appState === 'failed' && (
          <div className="absolute inset-0 bg-black z-40 flex flex-col items-center justify-center text-red-600 animate-in fade-in duration-300">
            <h1 className="text-9xl font-black tracking-tighter mb-4">FAILED</h1>
            <p className="text-white font-mono text-xl animate-bounce mt-8">
              Press <span className="border border-white px-2 py-1 rounded mx-1">Esc</span> to restart
            </p>
          </div>
        )}

        {!hasStartedTyping && appState === 'active' && !focusMode && (
           <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-400 text-sm animate-pulse">
             Start typing to begin...
           </div>
        )}
      </div>
    </div>
  );
}