import React, { useState } from 'react';
import { RotateCcw, CircleSlash } from 'lucide-react';

export default function DartboardKeypad({ onThrowDart, onUndoDart, canUndo, disabled }) {
  const [multiplier, setMultiplier] = useState(1); // 1 = Single, 2 = Double, 3 = Triple

  const quickNumbers = [
    20, 19, 18, 17, 16,
    15, 14, 13, 12, 11,
    10, 9, 8, 7, 6,
    5, 4, 3, 2, 1
  ];

  const handleScoreClick = (score) => {
    if (disabled) return;
    const mult = multiplier;
    const label = mult === 3 ? `T${score}` : mult === 2 ? `D${score}` : `${score}`;
    onThrowDart({
      score,
      multiplier: mult,
      label,
      ring: mult === 3 ? 'TRIPLE' : mult === 2 ? 'DOUBLE' : 'SINGLE'
    });
    setMultiplier(1);
  };

  const handleBull = (score) => {
    if (disabled) return;
    if (score === 50) {
      onThrowDart({ score: 50, multiplier: 1, label: 'BULL (50)', ring: 'DOUBLE_BULL' });
    } else {
      onThrowDart({ score: 25, multiplier: 1, label: '25', ring: 'SINGLE_BULL' });
    }
    setMultiplier(1);
  };

  const handleMiss = () => {
    if (disabled) return;
    onThrowDart({ score: 0, multiplier: 0, label: 'MISS', ring: 'MISS' });
    setMultiplier(1);
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-800 p-2 sm:p-2.5 shadow-2xl select-none">
      {/* Multiplier toggle buttons (Single / Double / Triple / Undo) */}
      <div className="grid grid-cols-4 gap-1.5 mb-1.5">
        <button
          type="button"
          onClick={() => setMultiplier(1)}
          className={`h-8 rounded-lg text-[11px] font-black tracking-wide transition-all ${
            multiplier === 1
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          SIMPLE
        </button>
        <button
          type="button"
          onClick={() => setMultiplier(2)}
          className={`h-8 rounded-lg text-[11px] font-black tracking-wide transition-all ${
            multiplier === 2
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          DOUBLE (x2)
        </button>
        <button
          type="button"
          onClick={() => setMultiplier(3)}
          className={`h-8 rounded-lg text-[11px] font-black tracking-wide transition-all ${
            multiplier === 3
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          TRIPLE (x3)
        </button>
        <button
          type="button"
          onClick={onUndoDart}
          disabled={!canUndo || disabled}
          className="h-8 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 flex items-center justify-center gap-1 transition-all active:scale-95"
          title="Annuler dernière flèche"
        >
          <RotateCcw className="w-3 h-3" />
          Annuler
        </button>
      </div>

      {/* Grid of Dart Numbers (5 cols x 4 rows) */}
      <div className="grid grid-cols-5 gap-1 mb-1.5">
        {quickNumbers.map((num) => (
          <button
            type="button"
            key={num}
            onClick={() => handleScoreClick(num)}
            disabled={disabled}
            className={`h-8 sm:h-9 rounded-lg text-xs sm:text-sm font-black transition-all active:scale-90 flex items-center justify-center ${
              multiplier === 3 ? 'bg-rose-500/25 border border-rose-500/50 text-rose-200' :
              multiplier === 2 ? 'bg-amber-500/25 border border-amber-500/50 text-amber-200' :
              'bg-slate-800/90 border border-slate-700/60 text-slate-100 hover:bg-slate-700 active:bg-slate-600'
            }`}
          >
            {multiplier === 3 ? `T${num}` : multiplier === 2 ? `D${num}` : num}
          </button>
        ))}
      </div>

      {/* Bulls & Miss row */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => handleBull(25)}
          disabled={disabled}
          className="h-8 rounded-lg text-[11px] font-black bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 active:scale-95 transition"
        >
          25 (Demi)
        </button>
        <button
          type="button"
          onClick={() => handleBull(50)}
          disabled={disabled}
          className="h-8 rounded-lg text-[11px] font-black bg-rose-950/60 border border-rose-500/50 text-rose-300 active:scale-95 transition"
        >
          BULL (50)
        </button>
        <button
          type="button"
          onClick={handleMiss}
          disabled={disabled}
          className="h-8 rounded-lg text-[11px] font-black bg-slate-800 border border-slate-700 text-slate-400 active:scale-95 transition flex items-center justify-center gap-1"
        >
          <CircleSlash className="w-3 h-3" />
          MANQUÉ (0)
        </button>
      </div>
    </div>
  );
}
