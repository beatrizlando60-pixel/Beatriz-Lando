import React, { useState, useRef, useEffect } from 'react';
import { AppState, Point, Suit, SuitState } from './types';
import { readFileAsBase64, getCroppedImg, generateTiledImage, composeFinalImage } from './utils/imageUtils';
import PhotoCropper from './components/PhotoCropper';
import SuitAdjuster from './components/SuitAdjuster';
import { enhancePhoto } from './services/geminiService';
import { Upload, Camera, Eraser, Download, RefreshCw, AlertCircle, Grid, MonitorDown, Shirt, Sun } from 'lucide-react';

// Hardcoded suits (Realistic Photos)
const SUITS: Suit[] = [
  { 
    id: 'real-suit-black', 
    name: 'Preto Executivo', 
    src: 'https://freepngimg.com/thumb/suit/2-suit-png-image.png' 
  },
  { 
    id: 'real-suit-navy', 
    name: 'Azul Marinho', 
    src: 'https://freepngimg.com/thumb/suit/4-suit-png-image.png' 
  },
  { 
    id: 'real-suit-grey', 
    name: 'Cinza Clássico', 
    src: 'https://freepngimg.com/thumb/suit/3-suit-png-image.png' 
  },
  { 
    id: 'real-suit-red-tie', 
    name: 'Gravata Vermelha', 
    src: 'https://freepngimg.com/thumb/suit/6-suit-png-image.png' 
  },
  { 
    id: 'real-suit-blue-tie', 
    name: 'Gravata Azul', 
    src: 'https://freepngimg.com/thumb/suit/12-suit-png-image.png' 
  },
  { 
    id: 'real-suit-tux', 
    name: 'Smoking', 
    src: 'https://freepngimg.com/thumb/suit/13-suit-png-image.png' 
  },
  {
    id: 'real-suit-pattern',
    name: 'Cinza Padrão',
    src: 'https://freepngimg.com/thumb/suit/5-suit-png-image.png'
  },
  {
     id: 'real-suit-dark',
     name: 'Preto Moderno',
     src: 'https://freepngimg.com/thumb/suit/15-suit-png-image.png'
  }
];

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.UPLOAD);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  
  // Base cropped image (clean, no brightness, no suit)
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  
  // Modifiers
  const [brightness, setBrightness] = useState<number>(100);
  const [activeSuitId, setActiveSuitId] = useState<string | null>(null);
  const [suitState, setSuitState] = useState<SuitState | null>(null);

  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      try {
        const base64 = await readFileAsBase64(file);
        setImageSrc(base64);
        setState(AppState.CROP);
        setError(null);
        // Reset modifiers
        setBrightness(100);
        setActiveSuitId(null);
        setSuitState(null);
      } catch (err) {
        setError("Erro ao ler imagem. Tente outra.");
      }
    }
  };

  const handleCropComplete = async (cropData: { offset: Point; zoom: number; containerWidth: number; containerHeight: number }) => {
    if (!imageSrc) return;
    try {
      const croppedBase64 = await getCroppedImg(
        imageSrc,
        cropData.offset,
        cropData.zoom,
        cropData.containerWidth,
        cropData.containerHeight
      );
      setCroppedImage(croppedBase64);
      setState(AppState.RESULT);
    } catch (e) {
      setError("Erro ao recortar imagem.");
    }
  };

  const processWithAi = async (action: 'REMOVE_BG') => {
    if (!croppedImage) return;
    
    setIsAiProcessing(true);
    setError(null);
    try {
      // For background removal, we always start from the current "clean" cropped image.
      // NOTE: If we already have a suit, removing BG might look weird if done AFTER.
      // Ideally user removes BG first.
      
      const enhanced = await enhancePhoto(croppedImage, action);
      // Update the base "cropped" image to be this new BG-removed version
      setCroppedImage(enhanced);
    } catch (e) {
      setError("A IA não conseguiu processar a imagem. Verifique sua chave de API ou tente novamente.");
    } finally {
      setIsAiProcessing(false);
    }
  };

  const saveSuit = (id: string, state: SuitState) => {
    setActiveSuitId(id);
    setSuitState(state);
    setState(AppState.RESULT);
  };
  
  // Callback when AI generates a full suited image
  const handleAiSuitGenerated = (newImage: string) => {
    setCroppedImage(newImage);
    // Since AI burned the suit into the image, we clear the manual suit overlay
    setActiveSuitId(null);
    setSuitState(null);
    setState(AppState.RESULT);
  };

  const getFinalProcessedImage = async () => {
    if (!croppedImage) return null;
    const suitSrc = activeSuitId ? SUITS.find(s => s.id === activeSuitId)?.src : undefined;
    return await composeFinalImage(croppedImage, brightness, suitSrc, suitState || undefined);
  };

  const handleDownloadSingle = async () => {
    const final = await getFinalProcessedImage();
    if (!final) return;
    
    const link = document.createElement('a');
    link.href = final;
    link.download = 'foto-3x4-unica.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSheet = async () => {
    const final = await getFinalProcessedImage();
    if (!final) return;

    try {
      const sheetBase64 = await generateTiledImage(final);
      const link = document.createElement('a');
      link.href = sheetBase64;
      link.download = 'foto-3x4-cartela-8un.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch(e) {
      setError("Erro ao gerar cartela.");
    }
  };

  const reset = () => {
    setState(AppState.UPLOAD);
    setImageSrc(null);
    setCroppedImage(null);
    setBrightness(100);
    setActiveSuitId(null);
    setSuitState(null);
    setError(null);
  };

  // Helper to get the current display image (with Suit overlaid via CSS for preview performance if needed, 
  // but let's just use the layers for preview)
  const currentSuit = activeSuitId ? SUITS.find(s => s.id === activeSuitId) : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-10 bg-primary rounded-sm shadow-sm flex items-center justify-center">
               <div className="w-4 h-5 border-2 border-white rounded-[1px]"></div>
            </div>
            <h1 className="font-bold text-lg tracking-tight text-slate-800">Foto 3x4 <span className="text-primary">Studio IA</span></h1>
          </div>
          <div className="flex items-center gap-3">
             {isInstallable && (
                <button onClick={handleInstallClick} className="hidden md:flex items-center gap-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full transition">
                  <MonitorDown size={14} />
                  Instalar App
                </button>
             )}
            {state !== AppState.UPLOAD && (
              <button onClick={reset} className="text-sm text-slate-500 hover:text-primary transition font-medium">
                Novo
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8 min-h-[calc(100vh-64px)] flex flex-col items-center justify-center">
        
        {error && (
          <div className="w-full max-w-md mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-start gap-3">
            <AlertCircle className="shrink-0 mt-0.5" size={18} />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {state === AppState.UPLOAD && (
          <div className="w-full max-w-md space-y-8 animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-slate-800">Crie sua foto 3x4</h2>
              <p className="text-slate-500">
                Tire uma selfie ou envie uma foto. Use nossa IA para remover o fundo, adicionar terno e imprimir.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 space-y-6">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group border-2 border-dashed border-slate-300 hover:border-primary hover:bg-blue-50/50 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300"
              >
                <div className="w-16 h-16 bg-blue-100 text-primary rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload size={28} />
                </div>
                <p className="font-medium text-slate-700">Carregar Foto</p>
                <p className="text-xs text-slate-400 mt-1">JPG, PNG até 5MB</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-400">ou use a câmera</span>
                </div>
              </div>

              <button 
                 onClick={() => fileInputRef.current?.click()}
                 className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3.5 rounded-xl transition shadow-lg active:scale-95"
              >
                <Camera size={20} />
                Tirar Foto Agora
              </button>
            </div>
          </div>
        )}

        {state === AppState.CROP && imageSrc && (
          <div className="w-full h-full animate-in fade-in zoom-in duration-300">
             <PhotoCropper 
                imageSrc={imageSrc} 
                onCropComplete={handleCropComplete} 
                onCancel={reset} 
             />
          </div>
        )}

        {state === AppState.SUIT_EDITOR && croppedImage && (
           <SuitAdjuster 
              imageSrc={croppedImage}
              suits={SUITS}
              initialSuitId={activeSuitId}
              initialState={suitState}
              onSave={saveSuit}
              onCancel={() => setState(AppState.RESULT)}
              onAiGenerated={handleAiSuitGenerated}
           />
        )}

        {state === AppState.RESULT && croppedImage && (
          <div className="w-full max-w-2xl animate-in slide-in-from-bottom-4 duration-500 flex flex-col md:flex-row gap-6">
             {/* Image Preview Side */}
             <div className="flex-1 bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 p-6 flex flex-col items-center justify-center bg-slate-100/50">
                <div className="relative shadow-lg group">
                   {/* Preview Container */}
                   <div 
                      className="w-48 h-64 relative overflow-hidden bg-white border-4 border-white rounded-sm"
                      style={{ filter: `brightness(${brightness}%)` }}
                   >
                       <img 
                          src={croppedImage} 
                          alt="Base" 
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                       {currentSuit && suitState && (
                         <img 
                            src={currentSuit.src}
                            alt="Suit Overlay"
                            className="absolute bottom-0 left-1/2 w-full origin-bottom"
                            style={{
                               width: '100%',
                               transform: `translateX(-50%) translate(${suitState.x}%, ${suitState.y}%) scale(${suitState.scale})`,
                            }}
                         />
                       )}
                   </div>
                  {/* Size indicator */}
                  <div className="absolute -right-8 top-1/2 -translate-y-1/2 rotate-90 text-xs text-slate-400 font-mono">4cm</div>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-slate-400 font-mono">3cm</div>
                </div>

                {/* Brightness Control */}
                <div className="w-full max-w-[200px] mt-8 space-y-2">
                   <div className="flex justify-between text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1"><Sun size={12}/> Brilho</span>
                      <span>{Math.round(brightness)}%</span>
                   </div>
                   <input 
                      type="range" min="50" max="150" value={brightness} 
                      onChange={(e) => setBrightness(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-amber-500"
                   />
                </div>
             </div>

             {/* Controls Side */}
             <div className="flex-1 space-y-6">
                
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Shirt size={18} className="text-purple-500" />
                    Edição
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <button 
                      onClick={() => processWithAi('REMOVE_BG')}
                      disabled={isAiProcessing}
                      className="flex items-center justify-start gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 text-sm font-medium transition disabled:opacity-50"
                    >
                      {isAiProcessing ? <RefreshCw className="animate-spin" size={18} /> : <Eraser size={18} className="text-blue-500" />}
                      Substituir Fundo por Branco
                    </button>

                     <button 
                      onClick={() => setState(AppState.SUIT_EDITOR)}
                      disabled={isAiProcessing}
                      className="flex items-center justify-start gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 text-sm font-medium transition disabled:opacity-50"
                    >
                      <Shirt size={18} className="text-indigo-600" />
                      {activeSuitId ? 'Ajustar/Trocar Terno' : 'Adicionar Terno'}
                    </button>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                   <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Download size={18} className="text-green-600" />
                    Baixar e Imprimir
                  </h3>

                  <div className="space-y-3">
                    <button 
                      onClick={handleDownloadSingle}
                      className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition shadow-lg active:scale-95"
                    >
                      <Download size={18} />
                      Baixar Única (3x4)
                    </button>

                    <button 
                      onClick={handleDownloadSheet}
                      className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition shadow-blue-200 shadow-lg active:scale-95"
                    >
                      <Grid size={18} />
                      Baixar Cartela (8 fotos)
                    </button>
                    <p className="text-xs text-center text-slate-400 mt-2">
                      Cartela formato 10x15cm (padrão de revelação)
                    </p>
                  </div>
                </div>
             </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;