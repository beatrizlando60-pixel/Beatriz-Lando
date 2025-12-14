import React, { useRef, useState, useEffect } from 'react';
import { Point } from '../types';
import { Move, ZoomIn, Info } from 'lucide-react';

interface PhotoCropperProps {
  imageSrc: string;
  onCropComplete: (cropData: { offset: Point; zoom: number; containerWidth: number; containerHeight: number }) => void;
  onCancel: () => void;
}

const PhotoCropper: React.FC<PhotoCropperProps> = ({ imageSrc, onCropComplete, onCancel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
  const [imgDimensions, setImgDimensions] = useState<{ w: number; h: number } | null>(null);

  // Load image dimensions to calculate proper fit
  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      setImgDimensions({ w: img.naturalWidth, h: img.naturalHeight });
    };
  }, [imageSrc]);

  // Touch/Mouse Event Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleDone = () => {
    if (containerRef.current) {
      onCropComplete({
        offset,
        zoom,
        containerWidth: containerRef.current.clientWidth,
        containerHeight: containerRef.current.clientHeight
      });
    }
  };

  // Calculate image styles for display
  const getImgStyle = () => {
    if (!containerRef.current || !imgDimensions) return {};
    
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;

    // Calculate base 'cover' scale
    const scaleX = containerW / imgDimensions.w;
    const scaleY = containerH / imgDimensions.h;
    const baseScale = Math.max(scaleX, scaleY);
    
    const currentScale = baseScale * zoom;

    return {
      width: imgDimensions.w * currentScale,
      height: imgDimensions.h * currentScale,
      transform: `translate(${offset.x}px, ${offset.y}px)`, // Centering handled by flex in CSS + offset
      cursor: isDragging ? 'grabbing' : 'grab',
      touchAction: 'none'
    };
  };

  return (
    <div className="flex flex-col h-full w-full max-w-md mx-auto bg-slate-900 rounded-xl overflow-hidden shadow-2xl">
      <div className="p-4 bg-slate-800 flex justify-between items-center z-10">
        <h3 className="text-white font-medium flex items-center gap-2">
           <Move size={18} /> Ajuste a Foto
        </h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-white text-sm">
          Cancelar
        </button>
      </div>

      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center select-none touch-none">
        {/* Overlay Guide - The "Passpartout" */}
        <div 
           className="relative w-full max-h-full aspect-[3/4] border-2 border-primary/50 overflow-hidden bg-slate-800/20 shadow-[0_0_0_100vmax_rgba(0,0,0,0.7)] z-10 pointer-events-none"
           style={{ maxWidth: '85vh' }}
        >
          {/* Facial Alignment Guides */}
          <div className="absolute top-[35%] left-1/2 -translate-x-1/2 w-32 h-40 border-2 border-white/30 rounded-full border-dashed opacity-50"></div>
          <div className="absolute top-1/2 left-0 w-full h-px bg-primary/30"></div>
          <div className="absolute top-0 left-1/2 w-px h-full bg-primary/30"></div>
        </div>

        {/* The Image Container */}
        <div 
          ref={containerRef}
          className="absolute inset-0 z-0 flex items-center justify-center w-full max-h-full aspect-[3/4] mx-auto my-auto"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <img 
            src={imageSrc} 
            alt="Upload" 
            style={getImgStyle()}
            className="max-w-none select-none pointer-events-auto transition-transform duration-75"
            draggable={false}
          />
        </div>
      </div>

      <div className="p-6 bg-slate-800 space-y-4 z-10">
        <div className="flex items-center gap-3 text-slate-300">
            <ZoomIn size={20} />
            <input 
              type="range" 
              min="1" 
              max="3" 
              step="0.1" 
              value={zoom} 
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-primary"
            />
        </div>

        <div className="flex items-start gap-2 bg-blue-900/30 p-3 rounded-lg border border-blue-500/20">
          <Info className="text-blue-400 shrink-0 mt-0.5" size={16} />
          <p className="text-xs text-blue-200">
            Arraste para posicionar. Encaixe o rosto na oval tracejada. Deixe espaço acima da cabeça.
          </p>
        </div>

        <button 
          onClick={handleDone}
          className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition shadow-lg active:scale-95"
        >
          Recortar Foto
        </button>
      </div>
    </div>
  );
};

export default PhotoCropper;