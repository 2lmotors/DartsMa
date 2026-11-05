import React, { useState } from 'react';
import { Volume2, VolumeX, Sparkles, Check, Play, X, Sliders } from 'lucide-react';
import { 
  getVoiceMuted, setVoiceMuted, 
  getVoiceStyle, setVoiceStyle, 
  testVoiceAnnouncement 
} from '../utils/soundEffects';

export default function VoiceSettingsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [isMuted, setIsMutedState] = useState(() => getVoiceMuted());
  const [style, setStyleState] = useState(() => getVoiceStyle());
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  const handleMuteToggle = () => {
    const next = !isMuted;
    setIsMutedState(next);
    setVoiceMuted(next);
  };

  const handleStyleSelect = (newStyle) => {
    setStyleState(newStyle);
    setVoiceStyle(newStyle);
  };

  const handleTest = () => {
    setIsPlayingTest(true);
    testVoiceAnnouncement();
    setTimeout(() => setIsPlayingTest(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-4 sm:p-5 w-full max-w-sm shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">Réglage de la Voix</h2>
              <p className="text-[10px] text-slate-400">Annonces des scores et du match</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toggle Mute / Sound Active */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800">
          <div className="flex items-center gap-2.5">
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
            <div>
              <span className="text-xs font-bold text-white block">
                {isMuted ? 'Voix désactivée' : 'Voix activée'}
              </span>
              <span className="text-[10px] text-slate-400">
                {isMuted ? 'Aucune annonce sonore' : 'Annonce des tirs & scores'}
              </span>
            </div>
          </div>

          <button
            onClick={handleMuteToggle}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 ${
              isMuted
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-emerald-500 text-slate-950 font-black'
            }`}
          >
            {isMuted ? 'Activer' : 'Couper'}
          </button>
        </div>

        {/* Voice Style Options */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-300 block">
            Tonalité de la voix :
          </label>

          <div className="space-y-1.5">
            {[
              {
                id: 'natural',
                name: 'Voix Naturelle (Recommandée Tablette)',
                desc: 'Prononciation fluide, claire et humaine (anti-robot)',
                badge: 'Optimal Hotwav'
              },
              {
                id: 'referee',
                name: 'Voix Arbitre Pro',
                desc: 'Tonalité grave style commentateur PDC officiel',
                badge: 'Style Tournoi'
              },
              {
                id: 'high_energy',
                name: 'Voix Dynamique',
                desc: 'Rythme plus rapide et énergique pour les parties rapides',
                badge: 'Rapide'
              }
            ].map(item => {
              const isSelected = style === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => handleStyleSelect(item.id)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-emerald-500/15 border-emerald-500/80 ring-1 ring-emerald-400/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold ${isSelected ? 'text-emerald-300' : 'text-slate-200'}`}>
                        {item.name}
                      </span>
                      {item.badge && (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1 py-0.2 rounded font-bold shrink-0">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{item.desc}</p>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Test Voice Button */}
        <div className="pt-1">
          <button
            onClick={handleTest}
            disabled={isMuted}
            className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 shadow-md ${
              isMuted
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
          >
            <Play className={`w-3.5 h-3.5 text-emerald-400 ${isPlayingTest ? 'animate-ping' : ''}`} />
            <span>{isPlayingTest ? 'Annonce en cours...' : 'Tester cette voix (Écouter)'}</span>
          </button>
        </div>

        {/* Footer */}
        <button
          onClick={onClose}
          className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition active:scale-95 text-center cursor-pointer shadow-lg shadow-emerald-500/20"
        >
          Valider
        </button>
      </div>
    </div>
  );
}

