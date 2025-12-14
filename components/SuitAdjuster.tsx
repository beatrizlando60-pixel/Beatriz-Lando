import React, { useState, useEffect, useRef } from 'react';
import { Suit, SuitState } from '../types';
import { Check, X, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ZoomIn } from 'lucide-react';

interface SuitAdjusterProps {
  imageSrc: string;
  suits: Suit[];
  initialSuitId?: string | null;
  initialState?: SuitState | null;
  onSave: (suitId: string, state: SuitState) => void;
  onCancel: () => void;
}

const SuitAdjuster: React.FC<SuitAdjusterProps> = ({ 
  imageSrc, 
  suits, 
  initialSuitId,
  initialState,
  onSave, 
  onCancel 
}) => {
  // Initialize state with passed props or defaults
  const [selectedSuit, setSelectedSuit] = useState<Suit>(() => {
    if (initialSuitId) {
      const found = suits.find(s => s.id === initialSuitId);
      if (found) return found;
    }
    return suits[0];
  });

  const [scale, setScale] = useState(initialState?.scale ?? 1.0);
  const [posX, setPosX] = useState(initialState?.x ?? 0);
  const [posY, setPosY] = useState(initialState?.y ?? 10);
  
  const handleSave = () => {
    onSave(selectedSuit.id, {
      selectedSuitId: selectedSuit.id,
      scale,
      x: posX,
      y: posY
    });
  };

  return (
    <div className="flex flex-col h-full w-full max-w-md mx-auto bg-slate-900 rounded-xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10">
      <div className="p-4 bg-slate-800 flex justify-between items-center z-10">
        <h3 className="text-white font-medium">Ajustar Terno</h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-white text-sm">
          Cancelar
        </button>
      </div>

      <div className="relative flex-1 bg-slate-100 overflow-hidden flex items-center justify-center">
        {/* Base Image */}
        <div className="relative w-full h-full flex items-center justify-center p-4">
             <div className="relative max-h-full aspect-[3/4] shadow-lg overflow-hidden bg-white">
                <img src={imageSrc} className="w-full h-full object-cover" alt="User" />
                
                {/* Suit Overlay */}
                <div 
                  className="absolute bottom-0 left-1/2 origin-bottom transition-all duration-75 ease-out pointer-events-none"
                  style={{
                    width: '100%',
                    transform: `translateX(-50%) translate(${posX}%, ${posY}%) scale(${scale})`,
                  }}
                >
                   <img src={selectedSuit.src} alt="Suit" className="w-full h-auto" />
                </div>
             </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-5 bg-slate-800 space-y-5 z-10">
        
        {/* Suit Selection */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {suits.map((suit) => (
            <button
              key={suit.id}
              onClick={() => setSelectedSuit(suit)}
              className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition ${
                selectedSuit.id === suit.id ? 'border-primary ring-2 ring-primary/30' : 'border-slate-600 opacity-60 hover:opacity-100'
              } bg-white`}
            >
              <img src={suit.src} alt={suit.name} className="w-full h-full object-contain object-top" />
            </button>
          ))}
        </div>

        {/* Sliders */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <ZoomIn size={16} className="text-slate-400" />
            <input 
              type="range" min="0.5" max="2.0" step="0.05"
              value={scale} onChange={(e) => setScale(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex text-slate-400 gap-1"><ArrowLeft size={14}/><ArrowRight size={14}/></div>
             <input 
              type="range" min="-50" max="50" step="1"
              value={posX} onChange={(e) => setPosX(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
           <div className="flex items-center gap-3">
            <div className="flex text-slate-400 gap-1"><ArrowUp size={14}/><ArrowDown size={14}/></div>
             <input 
              type="range" min="-20" max="50" step="1"
              value={posY} onChange={(e) => setPosY(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>

        <button 
          onClick={handleSave}
          className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition shadow-lg flex items-center justify-center gap-2"
        >
          <Check size={18} /> Aplicar Terno
        </button>
      </div>
    </div>
  );
};

export default SuitAdjuster;