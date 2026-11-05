import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, CheckCircle2, Wifi, Zap, Target, 
  HelpCircle, ArrowLeft, RefreshCw, Smartphone, Sparkles 
} from 'lucide-react';
import CameraVision from './CameraVision';
import CameraTutorialModal from './CameraTutorialModal';
import { playDartHitSound, announceDartScore } from '../utils/soundEffects';

export default function CompanionCameraView({ socket, roomId, onExit }) {
  const [isConnected, setIsConnected] = useState(socket?.connected || false);
  const [transmittedThrows, setTransmittedThrows] = useState([]);
  const [lastThrow, setLastThrow] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [camKey, setCamKey] = useState(0);

  // Device info label
  const deviceLabel = (() => {
    const ua = navigator.userAgent;
    if (/iPhone/i.test(ua)) return 'iPhone';
    if (/iPad/i.test(ua)) return 'iPad';
    if (/Android/i.test(ua)) return 'Smartphone Android';
    return 'Appareil Satellite';
  })();

  // Join companion room on socket connect or prop change
  useEffect(() => {
    if (!socket || !roomId) return;

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit('companion:join', {
        roomId,
        deviceName: deviceLabel
      });
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    if (socket.connected) {
      handleConnect();
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      if (socket.connected) {
        socket.emit('companion:leave', { roomId });
      }
    };
  }, [socket, roomId, deviceLabel]);

  // Handle dart detected by this companion camera
  const handleDartDetected = (dart) => {
    if (!dart) return;

    setLastThrow(dart);
    setTransmittedThrows(prev => [dart, ...prev.slice(0, 9)]);

    // Audio feedback on companion device
    playDartHitSound();
    if (dart.points > 0) {
      announceDartScore(dart.points);
    }

    // Transmit precision dart detection to master device!
    if (socket && socket.connected) {
      socket.emit('companion:dart_detected', {
        roomId,
        dart,
        deviceName: deviceLabel,
        timestamp: Date.now()
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col z-50 overflow-hidden select-none">
      {/* Top Header Bar */}
      <div 
        className="w-full bg-slate-900/95 border-b border-slate-800 p-2 sm:p-3 flex items-center justify-between shrink-0 z-30 gap-2"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0.5rem))' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-xs sm:text-sm font-black text-white truncate">Capteur Caméra Satellite</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded font-bold shrink-0">
                {deviceLabel}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 truncate">
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              <span>{isConnected ? `Synchronisé avec le match #${roomId.slice(-6)}` : 'Reconnexion au serveur...'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setCamKey(k => k + 1)}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-emerald-500/30"
            title="Défiger / Relancer la caméra"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Relancer</span>
          </button>

          <button
            onClick={() => setShowTutorial(true)}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            title="Tutoriel de positionnement et calibrage"
          >
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Guide & Aide</span>
          </button>

          {onExit && (
            <button
              onClick={onExit}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              title="Quitter le mode capteur"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Quitter</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Target Camera Vision Area */}
      <div className="flex-1 relative min-h-0 bg-slate-950 p-1 sm:p-2 flex flex-col items-center justify-center overflow-hidden">
        <div className="w-full h-full relative rounded-2xl overflow-hidden shadow-2xl border border-slate-800/80">
          <CameraVision
            key={camKey}
            onDartDetected={handleDartDetected}
            isMyTurn={true}
            disabled={false}
          />

          {/* Last detected throw banner overlay */}
          {lastThrow && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none bg-emerald-950/90 border border-emerald-400/60 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-black text-emerald-300 shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Impact capturé : {lastThrow.label} (+{lastThrow.points})</span>
              <span className="text-[10px] text-emerald-400/80 font-normal">➔ Envoyé au match</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Status / Instructions Bar */}
      <div 
        className="w-full bg-slate-900/95 border-t border-slate-800 p-2 sm:p-2.5 shrink-0 z-30 flex items-center justify-between text-[11px] text-slate-300"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0.5rem))' }}
      >
        <div className="flex items-center gap-2 truncate">
          <Target className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">
            {lastThrow 
              ? `Dernier tir envoyé : ${lastThrow.label} (${lastThrow.points} pts)` 
              : 'Capteur actif : orientez l\'objectif vers la cible et ajustez l\'araignée.'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <span className="text-[10px] text-slate-400 font-mono">
            {transmittedThrows.length} tir{transmittedThrows.length > 1 ? 's' : ''} transmis
          </span>
        </div>
      </div>

      {/* Tutorial Modal */}
      <CameraTutorialModal
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    </div>
  );
}
