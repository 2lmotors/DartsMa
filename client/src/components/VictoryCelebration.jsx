import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Award, Sparkles, CheckCircle, ArrowRight } from 'lucide-react';
import { playApplauseSound } from '../utils/soundEffects';

export default function VictoryCelebration({ winnerName, isMe, finalScore, onFinish }) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // 1. Play realistic crowd applause & cheer
    playApplauseSound();

    // 2. Confetti burst
    confetti({
      particleCount: 180,
      spread: 90,
      origin: { y: 0.5 }
    });

    // 3. Countdown timer: max 5 seconds
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimeout(onFinish, 200);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center p-4 z-50 animate-in fade-in duration-300 select-none">
      <div className="relative max-w-sm w-full bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-500/50 rounded-3xl p-6 sm:p-7 text-center shadow-2xl overflow-hidden">
        {/* Glow behind trophy */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-44 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Animated Trophy Icon */}
        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-600 to-yellow-400 p-0.5 shadow-xl shadow-amber-500/30 mb-4 animate-bounce">
          <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
            <Trophy className="w-10 h-10 text-amber-400" />
          </div>
        </div>

        {/* Title */}
        <span className="inline-block px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 mb-2">
          FIN DU MATCH
        </span>

        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          {isMe ? 'VOUS AVEZ GAGNÉ !' : `${winnerName} GAGNE !`}
        </h2>

        {finalScore && (
          <div className="text-sm font-bold text-slate-300 mt-1">
            Score Final : <span className="font-mono text-emerald-400 font-black">{finalScore}</span>
          </div>
        )}

        <p className="text-xs text-slate-400 mt-2">
          Bravo pour cette partie ! Vos statistiques ont été sauvegardées.
        </p>

        {/* 5 Seconds Auto-close Countdown Progress Bar */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
            <span>Retour au lobby</span>
            <span className="font-mono text-amber-400">{countdown}s</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${(countdown / 5) * 100}%` }}
            />
          </div>
        </div>

        <button
          onClick={onFinish}
          className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 active:scale-95"
        >
          <span>Passer maintenant</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

