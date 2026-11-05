import React, { useState, useEffect } from 'react';

/**
 * 1. Animation : Positionnement de la caméra (Hauteur 1.73m, distance, cône de vue, éclairage LED 360)
 */
export function PositioningAnimation() {
  return (
    <div className="w-full bg-slate-950/80 border border-emerald-500/30 rounded-2xl p-2 sm:p-3 overflow-hidden shadow-inner">
      <div className="flex items-center justify-between mb-1.5 px-1">
        <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Démonstration Visuelle : Disposition Optimale de l'Espace
        </span>
        <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
          Vue Latérale 3D
        </span>
      </div>

      <div className="relative w-full aspect-[21/9] sm:aspect-[24/9] max-h-[180px] sm:max-h-[210px] flex items-center justify-center">
        <svg 
          viewBox="0 0 640 240" 
          className="w-full h-full select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Dégradé Cône de vision caméra */}
            <linearGradient id="fovGradient" x1="100%" y1="50%" x2="0%" y2="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
              <stop offset="40%" stopColor="#06b6d4" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
            </linearGradient>

            {/* Lueur néon 360 LED */}
            <filter id="ledGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Pattern Grille sol */}
            <pattern id="floorGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.8" />
            </pattern>
          </defs>

          {/* Sol & Grille perspective */}
          <rect x="0" y="200" width="640" height="40" fill="url(#floorGrid)" />
          <line x1="0" y1="200" x2="640" y2="200" stroke="#334155" strokeWidth="2" />

          {/* Mur support de la cible */}
          <line x1="80" y1="20" x2="80" y2="200" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
          <line x1="74" y1="20" x2="74" y2="200" stroke="#1e293b" strokeWidth="2" strokeDasharray="4 4" />

          {/* Anneau Éclairage LED 360° lumineux (Surround) */}
          <g filter="url(#ledGlow)">
            <ellipse cx="80" cy="100" rx="14" ry="48" fill="none" stroke="#38bdf8" strokeWidth="3" opacity="0.9" />
            <ellipse cx="80" cy="100" rx="10" ry="42" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.7">
              <animate attributeName="opacity" values="0.5;0.9;0.5" dur="3s" repeatCount="indefinite" />
            </ellipse>
          </g>

          {/* Cible de profil avec relief */}
          <rect x="76" y="65" width="8" height="70" rx="2" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.5" />
          {/* Tranches segments rouge/vert */}
          <rect x="78" y="70" width="5" height="10" fill="#ef4444" />
          <rect x="78" y="80" width="5" height="8" fill="#10b981" />
          <rect x="78" y="96" width="5" height="8" fill="#ef4444" />
          <rect x="78" y="104" width="5" height="8" fill="#10b981" />
          <rect x="78" y="120" width="5" height="10" fill="#ef4444" />
          {/* Bullseye centre */}
          <circle cx="81" cy="100" r="3" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />

          {/* Fléchette plantée dans le Triple 20 */}
          <g className="animate-pulse">
            <line x1="82" y1="84" x2="115" y2="76" stroke="#94a3b8" strokeWidth="2" />
            <path d="M 115 76 L 128 72 L 126 80 Z" fill="#f59e0b" />
          </g>

          {/* Ligne & Cote Hauteur : 1.73m */}
          <g>
            <line x1="50" y1="100" x2="50" y2="200" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" />
            <line x1="44" y1="100" x2="56" y2="100" stroke="#10b981" strokeWidth="2" />
            <line x1="44" y1="200" x2="56" y2="200" stroke="#10b981" strokeWidth="2" />
            
            {/* Badge Hauteur */}
            <rect x="22" y="140" width="46" height="20" rx="4" fill="#0f172a" stroke="#10b981" strokeWidth="1" />
            <text x="45" y="154" fill="#34d399" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              1,73 m
            </text>
          </g>

          {/* Cône de vision caméra (FOV) avec balayage radar */}
          <polygon points="80,50 80,150 490,120" fill="url(#fovGradient)" />
          
          {/* Onde de scan animée qui balaie le cône */}
          <ellipse cx="280" cy="106" rx="12" ry="34" fill="none" stroke="#10b981" strokeWidth="2" opacity="0.8">
            <animate attributeName="cx" values="470;80" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="rx" values="4;16" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="ry" values="10;48" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.9;0.1" dur="2.4s" repeatCount="indefinite" />
          </ellipse>

          {/* Trépied & Caméra / Smartphone */}
          <g>
            {/* Pieds du trépied */}
            <line x1="490" y1="130" x2="465" y2="200" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
            <line x1="490" y1="130" x2="490" y2="200" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
            <line x1="490" y1="130" x2="515" y2="200" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
            <circle cx="490" cy="130" r="5" fill="#334155" stroke="#94a3b8" strokeWidth="1.5" />

            {/* Rotule & Smartphone incliné */}
            <line x1="490" y1="130" x2="490" y2="115" stroke="#cbd5e1" strokeWidth="3" />
            
            {/* Support rotatif avec angle 15° vers le bas */}
            <g transform="rotate(-8 490 115)">
              {/* Corps du smartphone */}
              <rect x="484" y="90" width="12" height="28" rx="2.5" fill="#020617" stroke="#38bdf8" strokeWidth="1.5" />
              {/* Écran avec flux vidéo vert */}
              <rect x="485.5" y="92" width="9" height="24" rx="1.5" fill="#064e3b" />
              <circle cx="490" cy="104" r="2.5" fill="#34d399" />
              {/* Objectif caméra vers la gauche */}
              <circle cx="482" cy="98" r="2.5" fill="#0284c7" stroke="#38bdf8" strokeWidth="1">
                <animate attributeName="r" values="2;3.2;2" dur="1.5s" repeatCount="indefinite" />
              </circle>
            </g>

            {/* Tag Caméra */}
            <rect x="455" y="60" width="70" height="20" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
            <text x="490" y="74" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">
              📷 Caméra
            </text>
          </g>

          {/* Joueur / Pas de tir (Oche) au fond à droite */}
          <g opacity="0.85">
            {/* Ligne de tir au sol */}
            <rect x="560" y="196" width="10" height="6" rx="1" fill="#f59e0b" />
            <text x="565" y="190" fill="#f59e0b" fontSize="9" fontWeight="bold" textAnchor="middle">
              Oche (2,37m)
            </text>
            
            {/* Silhouette schématique du joueur */}
            <circle cx="590" cy="85" r="9" fill="#475569" stroke="#94a3b8" strokeWidth="1" />
            <path d="M 590 95 L 590 145 L 575 200 M 590 145 L 602 200" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
            <path d="M 590 110 L 565 96 L 545 100" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
          </g>

          {/* Cote Distance Caméra - Cible : 1.5m à 2.5m */}
          <g>
            <line x1="80" y1="218" x2="490" y2="218" stroke="#38bdf8" strokeWidth="1.5" />
            <polygon points="80,218 88,214 88,222" fill="#38bdf8" />
            <polygon points="490,218 482,214 482,222" fill="#38bdf8" />
            
            <rect x="235" y="208" width="115" height="18" rx="4" fill="#020617" stroke="#38bdf8" strokeWidth="1" />
            <text x="292" y="221" fill="#7dd3fc" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              Distance : 1,5 m - 2,5 m
            </text>
          </g>

          {/* Badge Validé */}
          <g transform="translate(140, 25)">
            <rect width="130" height="24" rx="12" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
            <circle cx="14" cy="12" r="6" fill="#10b981" />
            <path d="M 11 12 L 13 14 L 17 10" fill="none" stroke="#022c22" strokeWidth="1.5" strokeLinecap="round" />
            <text x="70" y="16" fill="#a7f3d0" fontSize="10" fontWeight="bold" textAnchor="middle">
              Éclairage 360° + Trépied
            </text>
          </g>
        </svg>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5 text-center text-[10px]">
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg py-1 px-1.5">
          <span className="text-slate-400 block text-[9px]">Hauteur cible</span>
          <span className="text-emerald-400 font-bold font-mono">1,73 m (Bull)</span>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg py-1 px-1.5">
          <span className="text-slate-400 block text-[9px]">Distance trépied</span>
          <span className="text-sky-400 font-bold font-mono">1,5 m - 2,5 m</span>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg py-1 px-1.5">
          <span className="text-slate-400 block text-[9px]">Angle idéal</span>
          <span className="text-amber-400 font-bold font-mono">30° à 45° dégagé</span>
        </div>
      </div>
    </div>
  );
}

/**
 * 2. Animation : Caméra Satellite Companion (Dual Device Sync)
 */
export function CompanionAnimation() {
  const [score, setScore] = useState(501);
  const [pulseImpact, setPulseImpact] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulseImpact(true);
      setTimeout(() => {
        setScore((prev) => (prev <= 121 ? 501 : prev - 60));
        setPulseImpact(false);
      }, 700);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-slate-950/80 border border-blue-500/30 rounded-2xl p-2 sm:p-3 overflow-hidden shadow-inner">
      <div className="flex items-center justify-between mb-1.5 px-1">
        <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Démonstration Visuelle : Synchronisation Double Appareil
        </span>
        <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
          WebSocket Local 0 Latence
        </span>
      </div>

      <div className="relative w-full aspect-[21/9] sm:aspect-[24/9] max-h-[180px] sm:max-h-[210px] flex items-center justify-center">
        <svg 
          viewBox="0 0 640 240" 
          className="w-full h-full select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Dégradé onde Wi-Fi */}
            <linearGradient id="wifiBeam" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#818cf8" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
            </linearGradient>

            <filter id="neonPulse" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Zone Cible à gauche */}
          <g transform="translate(30, 40)">
            {/* Anneau cible */}
            <circle cx="45" cy="80" r="42" fill="#0f172a" stroke="#475569" strokeWidth="2" />
            <circle cx="45" cy="80" r="32" fill="none" stroke="#ef4444" strokeWidth="4" />
            <circle cx="45" cy="80" r="22" fill="none" stroke="#10b981" strokeWidth="3" />
            <circle cx="45" cy="80" r="8" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
            <line x1="45" y1="38" x2="45" y2="122" stroke="#64748b" strokeWidth="1" />
            <line x1="3" y1="80" x2="87" y2="80" stroke="#64748b" strokeWidth="1" />

            {/* Impact Flèche T20 animé */}
            <circle cx="45" cy="58" r={pulseImpact ? "8" : "3"} fill="#f59e0b" filter={pulseImpact ? "url(#neonPulse)" : ""}>
              <animate attributeName="opacity" values="0.6;1;0.6" dur="0.8s" repeatCount="indefinite" />
            </circle>
            {pulseImpact && (
              <circle cx="45" cy="58" r="14" fill="none" stroke="#f59e0b" strokeWidth="2" opacity="0.8">
                <animate attributeName="r" values="3;18" dur="0.6s" repeatCount="1" />
                <animate attributeName="opacity" values="1;0" dur="0.6s" repeatCount="1" />
              </circle>
            )}

            <text x="45" y="140" fill="#cbd5e1" fontSize="10" fontWeight="bold" textAnchor="middle">
              Cible Réelle
            </text>
          </g>

          {/* Smartphone Capteur Satellite (près de la cible) */}
          <g transform="translate(145, 30)">
            {/* Trépied miniature */}
            <line x1="35" y1="125" x2="18" y2="175" stroke="#475569" strokeWidth="2.5" />
            <line x1="35" y1="125" x2="35" y2="175" stroke="#64748b" strokeWidth="2.5" />
            <line x1="35" y1="125" x2="52" y2="175" stroke="#475569" strokeWidth="2.5" />

            {/* Téléphone en mode capteur */}
            <rect x="15" y="35" width="40" height="75" rx="6" fill="#020617" stroke="#38bdf8" strokeWidth="2" />
            <rect x="18" y="42" width="34" height="60" rx="3" fill="#0f172a" />
            
            {/* Viseur optique sur l'écran du tel */}
            <circle cx="35" cy="72" r="16" fill="none" stroke="#10b981" strokeWidth="1.2" strokeDasharray="3 2" />
            <circle cx="35" cy="72" r="3" fill="#ef4444" />
            <text x="35" y="52" fill="#38bdf8" fontSize="7" fontWeight="bold" textAnchor="middle">
              MOTION CAM
            </text>
            <text x="35" y="96" fill="#34d399" fontSize="7" fontWeight="bold" textAnchor="middle">
              CAPTEUR ON
            </text>

            {/* Cadre de détection IA sur le triple */}
            <rect x="29" y="60" width="12" height="8" rx="1" fill="none" stroke="#f59e0b" strokeWidth="1.5" className="animate-pulse" />

            {/* Label Appareil 2 */}
            <rect x="-5" y="185" width="80" height="22" rx="5" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
            <text x="35" y="199" fill="#38bdf8" fontSize="9" fontWeight="black" textAnchor="middle">
              📱 2e APPAREIL
            </text>
          </g>

          {/* Onde de transmission sans-fil (Paquets de données vers Maître) */}
          <g>
            {/* Ligne de flux */}
            <line x1="215" y1="95" x2="420" y2="95" stroke="url(#wifiBeam)" strokeWidth="3" strokeDasharray="6 6">
              <animate attributeName="stroke-dashoffset" values="40;0" dur="1s" repeatCount="indefinite" />
            </line>

            {/* Paquet de données volant */}
            <g>
              <animateTransform
                attributeName="transform"
                type="translate"
                values="220, 95; 410, 95"
                dur="1.4s"
                repeatCount="indefinite"
              />
              <circle cx="0" cy="0" r="10" fill="#38bdf8" filter="url(#neonPulse)" opacity="0.9" />
              <text x="0" y="3" fill="#020617" fontSize="8" fontWeight="black" textAnchor="middle">
                T20
              </text>
            </g>

            {/* Icône Wi-Fi au milieu */}
            <g transform="translate(305, 50)">
              <circle cx="15" cy="15" r="18" fill="#0f172a" stroke="#818cf8" strokeWidth="1.5" />
              <path d="M 6 12 A 13 13 0 0 1 24 12" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" />
              <path d="M 9 16 A 9 9 0 0 1 21 16" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" />
              <circle cx="15" cy="21" r="2" fill="#c7d2fe" />
              <text x="15" y="38" fill="#a5b4fc" fontSize="8" fontWeight="bold" textAnchor="middle">
                SYNC INSTANTANÉE
              </text>
            </g>
          </g>

          {/* Écran Maître (PC / Tablette / TV au pas de tir) */}
          <g transform="translate(435, 30)">
            {/* Cadre de l'écran principal */}
            <rect x="0" y="15" width="175" height="120" rx="8" fill="#020617" stroke="#10b981" strokeWidth="2" />
            <rect x="5" y="20" width="165" height="110" rx="4" fill="#0f172a" />
            
            {/* Barre de titre */}
            <rect x="5" y="20" width="165" height="16" fill="#1e293b" />
            <circle cx="13" cy="28" r="3" fill="#ef4444" />
            <circle cx="21" cy="28" r="3" fill="#f59e0b" />
            <circle cx="29" cy="28" r="3" fill="#10b981" />
            <text x="90" y="32" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle">
              DARTSMA MATCH 501
            </text>

            {/* Contenu Match : Score en gros */}
            <g transform="translate(15, 45)">
              <text x="35" y="24" fill="#64748b" fontSize="9" fontWeight="bold">SCORE RESTANT</text>
              <text x="35" y="55" fill="#ffffff" fontSize="30" fontWeight="black" fontFamily="monospace">
                {score}
              </text>

              {/* Indicateur dernier coup */}
              <rect x="80" y="32" width="60" height="24" rx="4" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
              <text x="110" y="48" fill="#34d399" fontSize="12" fontWeight="black" textAnchor="middle">
                +60 pts (T20)
              </text>
            </g>

            {/* Webcam adverse miniature en bas à droite */}
            <rect x="115" y="85" width="50" height="35" rx="3" fill="#020617" stroke="#334155" strokeWidth="1" />
            <circle cx="140" cy="100" r="7" fill="#475569" />
            <text x="140" y="117" fill="#64748b" fontSize="6" textAnchor="middle">Adversaire Live</text>

            {/* Pied de l'écran maître */}
            <rect x="75" y="135" width="25" height="18" fill="#334155" />
            <rect x="55" y="153" width="65" height="6" rx="2" fill="#475569" />

            {/* Label Appareil Maître */}
            <rect x="35" y="185" width="105" height="22" rx="5" fill="#0f172a" stroke="#10b981" strokeWidth="1" />
            <text x="88" y="199" fill="#10b981" fontSize="9" fontWeight="black" textAnchor="middle">
              💻 APPAREIL MAÎTRE (Oche)
            </text>
          </g>
        </svg>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-center text-[10px]">
        <div className="bg-slate-900/90 border border-blue-500/30 rounded-lg p-1.5 flex items-center gap-2">
          <span className="w-5 h-5 rounded-md bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0">1</span>
          <span className="text-left text-slate-300 text-[10px] leading-tight">
            <strong>Satellite (près cible) :</strong> Filmez & détectez sans surcharger votre écran de jeu.
          </span>
        </div>
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-lg p-1.5 flex items-center gap-2">
          <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">2</span>
          <span className="text-left text-slate-300 text-[10px] leading-tight">
            <strong>Maître (au pas de tir) :</strong> Affichage géant des scores, arbitre IA et caméra adverse.
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * 3. Animation : Calibrage de l'araignée & Segments Fluo
 */
export function CalibrationAnimation() {
  const [step, setStep] = useState(0);

  // Cycle automatique des 4 étapes de calibrage
  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % 4);
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  const stepsInfo = [
    { label: "1. Centrage Bullseye", desc: "Curseurs X & Y calés au centre rouge", color: "text-red-400" },
    { label: "2. Zoom Cercle Extérieur", desc: "Rayon aligné sur le fil des doubles", color: "text-amber-400" },
    { label: "3. Orientation Segment 20", desc: "20 aligné à la verticale (12h00)", color: "text-sky-400" },
    { label: "4. Segments Fluo Actifs", desc: "Triples et Doubles illuminés en néon", color: "text-emerald-400" },
  ];

  return (
    <div className="w-full bg-slate-950/80 border border-amber-500/30 rounded-2xl p-2 sm:p-3 overflow-hidden shadow-inner">
      <div className="flex items-center justify-between mb-1.5 px-1">
        <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          Démonstration Visuelle : Calibrage Pas-à-Pas de l'Araignée
        </span>
        <div className="flex items-center gap-1">
          {[0, 1, 2, 3].map((idx) => (
            <button
              key={idx}
              onClick={() => setStep(idx)}
              className={`w-4 h-4 rounded-full text-[8px] font-black transition cursor-pointer flex items-center justify-center ${
                step === idx 
                  ? 'bg-amber-400 text-slate-950 scale-110 shadow-sm' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full aspect-[21/9] sm:aspect-[24/9] max-h-[185px] sm:max-h-[215px] flex items-center justify-center">
        <svg 
          viewBox="0 0 640 240" 
          className="w-full h-full select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="neonGlowTriple" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="neonGlowDouble" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Cible Dartboard de référence à gauche */}
          <g transform="translate(150, 120)">
            {/* Fond de la cible */}
            <circle cx="0" cy="0" r="95" fill="#090d16" stroke="#334155" strokeWidth="4" />
            
            {/* Segments radiaux alternés (Noir & Blanc cassé) */}
            {[...Array(20)].map((_, i) => {
              const angle1 = (i * 18 - 9) * (Math.PI / 180);
              const angle2 = (i * 18 + 9) * (Math.PI / 180);
              const isEven = i % 2 === 0;
              const x1 = Math.cos(angle1) * 88;
              const y1 = Math.sin(angle1) * 88;
              const x2 = Math.cos(angle2) * 88;
              const y2 = Math.sin(angle2) * 88;
              return (
                <path
                  key={i}
                  d={`M 0 0 L ${x1} ${y1} A 88 88 0 0 1 ${x2} ${y2} Z`}
                  fill={isEven ? "#0f172a" : "#1e293b"}
                  stroke="#334155"
                  strokeWidth="0.8"
                />
              );
            })}

            {/* Anneau Double (Extérieur) */}
            <circle cx="0" cy="0" r="88" fill="none" stroke="#ef4444" strokeWidth="8" opacity="0.4" />
            
            {/* Anneau Triple (Intérieur) */}
            <circle cx="0" cy="0" r="54" fill="none" stroke="#10b981" strokeWidth="8" opacity="0.4" />

            {/* Outer Bull & Bullseye */}
            <circle cx="0" cy="0" r="14" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
            <circle cx="0" cy="0" r="6" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />

            {/* SEGMENTS FLUO ILLUMINÉS (Étape 4) */}
            {step === 3 && (
              <g filter="url(#neonGlowTriple)">
                {/* Lit Triple 20 Fluo Cyan */}
                <path
                  d="M -9 -52 A 54 54 0 0 1 9 -52 L 7 -46 A 48 48 0 0 0 -7 -46 Z"
                  fill="#00f2fe"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="animate-pulse"
                />
                {/* Lit Double 20 Fluo Vert Néon */}
                <path
                  d="M -15 -85 A 88 88 0 0 1 15 -85 L 13 -79 A 82 82 0 0 0 -13 -79 Z"
                  fill="#10b981"
                  stroke="#a7f3d0"
                  strokeWidth="1.5"
                  className="animate-pulse"
                />
              </g>
            )}

            {/* ARAIGNÉE VIRTUELLE JAUNE DE CALIBRAGE */}
            {/* Étape 0 : Crosshair qui bouge pour se caler sur le Bullseye */}
            {step === 0 && (
              <g>
                <circle cx="0" cy="0" r="28" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 2">
                  <animate attributeName="r" values="36;14;20" dur="1.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.3;1;0.6" dur="1.2s" repeatCount="indefinite" />
                </circle>
                <line x1="-30" y1="0" x2="30" y2="0" stroke="#ef4444" strokeWidth="2" />
                <line x1="0" y1="-30" x2="0" y2="30" stroke="#ef4444" strokeWidth="2" />
                <circle cx="0" cy="0" r="4" fill="#ffffff" />
              </g>
            )}

            {/* Étape 1 : Zoom rayon qui s'étend */}
            {step === 1 && (
              <g>
                <circle cx="0" cy="0" r="70" fill="none" stroke="#facc15" strokeWidth="3" strokeDasharray="6 4">
                  <animate attributeName="r" values="50;88;88" dur="1.5s" repeatCount="indefinite" />
                  <animate attributeName="stroke" values="#f59e0b;#facc15;#10b981" dur="1.5s" repeatCount="indefinite" />
                </circle>
                <text x="0" y="-95" fill="#facc15" fontSize="10" fontWeight="bold" textAnchor="middle">
                  ZOOM ➔ ALIGNER SUR FIL DES DOUBLES
                </text>
              </g>
            )}

            {/* Étape 2 : Rotation vers le 20 */}
            {step === 2 && (
              <g>
                <line x1="0" y1="-20" x2="0" y2="-100" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round">
                  <animate attributeName="transform" type="rotate" values="-25 0 0; 0 0 0; 0 0 0" dur="1.6s" repeatCount="indefinite" />
                </line>
                <polygon points="0,-106 -6,-96 6,-96" fill="#38bdf8" />
                <text x="0" y="-112" fill="#38bdf8" fontSize="12" fontWeight="black" textAnchor="middle">
                  20 VERTICAL (12h00)
                </text>
              </g>
            )}

            {/* Étape 3 : Araignée complète alignée + lueur */}
            {step === 3 && (
              <g>
                <circle cx="0" cy="0" r="88" fill="none" stroke="#facc15" strokeWidth="2" opacity="0.9" />
                <circle cx="0" cy="0" r="54" fill="none" stroke="#facc15" strokeWidth="2" opacity="0.9" />
                <circle cx="0" cy="0" r="14" fill="none" stroke="#facc15" strokeWidth="2" />
                <line x1="0" y1="-88" x2="0" y2="88" stroke="#facc15" strokeWidth="1.5" />
                <line x1="-88" y1="0" x2="88" y2="0" stroke="#facc15" strokeWidth="1.5" />
                <circle cx="0" cy="0" r="3" fill="#10b981" />
              </g>
            )}

            {/* Numéro 20 officiel en haut */}
            <circle cx="0" cy="-105" r="12" fill="#020617" stroke="#cbd5e1" strokeWidth="1.5" />
            <text x="0" y="-101" fill="#ffffff" fontSize="11" fontWeight="black" textAnchor="middle">
              20
            </text>
          </g>

          {/* Panneau explicatif étape courante à droite */}
          <g transform="translate(300, 20)">
            <rect x="0" y="0" width="320" height="200" rx="12" fill="#020617" stroke="#334155" strokeWidth="1.5" />
            
            {/* Header de la carte */}
            <rect x="0" y="0" width="320" height="32" rx="12" fill="#0f172a" />
            <rect x="0" y="24" width="320" height="8" fill="#0f172a" />
            <text x="16" y="20" fill="#facc15" fontSize="11" fontWeight="black">
              CHECKLIST DU CALIBRAGE PARFAIT
            </text>

            {/* Les 4 étapes avec statut interactif */}
            {stepsInfo.map((item, idx) => {
              const isActive = step === idx;
              const isPassed = step > idx;
              return (
                <g key={idx} transform={`translate(16, ${42 + idx * 38})`}>
                  <rect 
                    x="0" 
                    y="0" 
                    width="288" 
                    height="32" 
                    rx="6" 
                    fill={isActive ? "#1e293b" : "#0b1120"} 
                    stroke={isActive ? "#f59e0b" : isPassed ? "#10b981" : "#1e293b"} 
                    strokeWidth={isActive ? "1.5" : "1"} 
                  />
                  
                  {/* Puce statut */}
                  <circle 
                    cx="16" 
                    cy="16" 
                    r="9" 
                    fill={isActive ? "#f59e0b" : isPassed ? "#10b981" : "#334155"} 
                  />
                  {isPassed ? (
                    <text x="16" y="20" fill="#020617" fontSize="10" fontWeight="black" textAnchor="middle">✓</text>
                  ) : (
                    <text x="16" y="20" fill={isActive ? "#020617" : "#cbd5e1"} fontSize="10" fontWeight="bold" textAnchor="middle">{idx + 1}</text>
                  )}

                  {/* Titre & Description */}
                  <text x="34" y="14" fill={isActive ? "#ffffff" : isPassed ? "#34d399" : "#94a3b8"} fontSize="10" fontWeight="bold">
                    {item.label}
                  </text>
                  <text x="34" y="25" fill="#64748b" fontSize="8">
                    {item.desc}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <div className="mt-2 p-2 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-slate-300">
            Étape active : <strong className="text-white">{stepsInfo[step].label}</strong>
          </span>
        </div>
        <span className="text-amber-400 font-mono text-[10px]">
          {stepsInfo[step].desc}
        </span>
      </div>
    </div>
  );
}

/**
 * 4. Animation : Qualité de capture & Résolution HD (800p vs 1024p vs 1600p)
 */
export function ResolutionAnimation() {
  const [selectedRes, setSelectedRes] = useState('1024');

  return (
    <div className="w-full bg-slate-950/80 border border-purple-500/30 rounded-2xl p-2 sm:p-3 overflow-hidden shadow-inner">
      <div className="flex items-center justify-between mb-1.5 px-1">
        <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
          </span>
          Démonstration Visuelle : Finesse Optique sur le Triple 20 (9,6 mm)
        </span>
        <div className="flex items-center gap-1">
          {['800', '1024', '1600'].map((res) => (
            <button
              key={res}
              onClick={() => setSelectedRes(res)}
              className={`px-2 py-0.5 rounded-md text-[9px] font-black transition cursor-pointer ${
                selectedRes === res
                  ? 'bg-purple-500 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {res}px
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full aspect-[21/9] sm:aspect-[24/9] max-h-[185px] sm:max-h-[215px] flex items-center justify-center">
        <svg 
          viewBox="0 0 640 240" 
          className="w-full h-full select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="laserGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* PANNEAU 1 : 800px (HD Standard) */}
          <g 
            transform="translate(15, 20)" 
            opacity={selectedRes === '800' ? "1" : "0.55"}
            className="cursor-pointer"
            onClick={() => setSelectedRes('800')}
          >
            <rect 
              x="0" y="0" width="195" height="195" rx="10" 
              fill="#090d16" 
              stroke={selectedRes === '800' ? "#10b981" : "#1e293b"} 
              strokeWidth={selectedRes === '800' ? "2" : "1"} 
            />
            <rect x="0" y="0" width="195" height="26" rx="10" fill="#0f172a" />
            <rect x="0" y="20" width="195" height="6" fill="#0f172a" />
            <text x="97" y="17" fill="#34d399" fontSize="10" fontWeight="black" textAnchor="middle">
              800 px (HD Rapide)
            </text>

            {/* Zoom gros pixels simulant basse résolution */}
            <g transform="translate(15, 38)">
              {/* Fil métallique pixelisé (marches d'escalier) */}
              <rect x="0" y="0" width="165" height="120" fill="#020617" />
              
              {/* Grille de gros pixels */}
              {[...Array(6)].map((_, r) => (
                [...Array(8)].map((_, c) => (
                  <rect 
                    key={`${r}-${c}`}
                    x={c * 20} 
                    y={r * 20} 
                    width="19" 
                    height="19" 
                    fill={r === 2 || r === 3 ? (c >= 2 && c <= 5 ? "#ef4444" : "#1e293b") : "#090d16"} 
                    opacity="0.8"
                  />
                ))
              ))}

              {/* Réticule imprécis */}
              <circle cx="80" cy="55" r="14" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" />
              <circle cx="80" cy="55" r="4" fill="#f59e0b" />
            </g>

            {/* Badge Performance */}
            <text x="97" y="180" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle">
              ⚡ 60 FPS • Smart / Tablettes modestes
            </text>
          </g>

          {/* PANNEAU 2 : 1024px (Recommandé) */}
          <g 
            transform="translate(222, 20)" 
            opacity={selectedRes === '1024' ? "1" : "0.55"}
            className="cursor-pointer"
            onClick={() => setSelectedRes('1024')}
          >
            <rect 
              x="0" y="0" width="195" height="195" rx="10" 
              fill="#090d16" 
              stroke={selectedRes === '1024' ? "#38bdf8" : "#1e293b"} 
              strokeWidth={selectedRes === '1024' ? "2.5" : "1"} 
            />
            <rect x="0" y="0" width="195" height="26" rx="10" fill="#0f172a" />
            <rect x="0" y="20" width="195" height="6" fill="#0f172a" />
            <text x="97" y="17" fill="#38bdf8" fontSize="10" fontWeight="black" textAnchor="middle">
              1024 px (Équilibré Pro)
            </text>

            {/* Pastille Recommandé */}
            <rect x="120" y="-6" width="68" height="14" rx="3" fill="#38bdf8" />
            <text x="154" y="4" fill="#020617" fontSize="7" fontWeight="black" textAnchor="middle">
              RECOMMANDÉ
            </text>

            {/* Zoom net avec sous-pixels */}
            <g transform="translate(15, 38)">
              <rect x="0" y="0" width="165" height="120" fill="#020617" />
              
              {/* Lit Triple 20 net */}
              <rect x="25" y="40" width="115" height="32" rx="2" fill="#ef4444" opacity="0.85" />
              <rect x="25" y="40" width="115" height="32" rx="2" fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
              
              <text x="82" y="60" fill="#ffffff" fontSize="10" fontWeight="black" textAnchor="middle">
                TRIPLE 20 (9,6 mm)
              </text>

              {/* Réticule laser fin */}
              <circle cx="82" cy="56" r="10" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
              <line x1="72" y1="56" x2="92" y2="56" stroke="#38bdf8" strokeWidth="1" />
              <line x1="82" y1="46" x2="82" y2="66" stroke="#38bdf8" strokeWidth="1" />
              <circle cx="82" cy="56" r="2.5" fill="#ffffff" />
            </g>

            {/* Badge Précision */}
            <text x="97" y="180" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle">
              🎯 Précision 0,5 mm • iPhone / Android
            </text>
          </g>

          {/* PANNEAU 3 : 1600px (Ultra HD) */}
          <g 
            transform="translate(430, 20)" 
            opacity={selectedRes === '1600' ? "1" : "0.55"}
            className="cursor-pointer"
            onClick={() => setSelectedRes('1600')}
          >
            <rect 
              x="0" y="0" width="195" height="195" rx="10" 
              fill="#090d16" 
              stroke={selectedRes === '1600' ? "#a855f7" : "#1e293b"} 
              strokeWidth={selectedRes === '1600' ? "2" : "1"} 
            />
            <rect x="0" y="0" width="195" height="26" rx="10" fill="#0f172a" />
            <rect x="0" y="20" width="195" height="6" fill="#0f172a" />
            <text x="97" y="17" fill="#c084fc" fontSize="10" fontWeight="black" textAnchor="middle">
              1600 px (Ultra HD Max)
            </text>

            {/* Zoom microscope laser */}
            <g transform="translate(15, 38)">
              <rect x="0" y="0" width="165" height="120" fill="#020617" />
              
              {/* Tranche de fil métallique biseauté (profil réel PDC) */}
              <polygon points="10,48 155,48 155,52 10,52" fill="#e2e8f0" />
              <polygon points="10,82 155,82 155,86 10,86" fill="#e2e8f0" />
              
              {/* Lit rouge haute définition */}
              <rect x="10" y="52" width="145" height="30" fill="#b91c1c" />
              
              {/* Rayons de balayage laser vert submillimétrique */}
              <g filter="url(#laserGlow)">
                <line x1="10" y1="67" x2="155" y2="67" stroke="#34d399" strokeWidth="0.8" strokeDasharray="2 2" />
                <circle cx="82" cy="67" r="12" fill="none" stroke="#a855f7" strokeWidth="1.5">
                  <animate attributeName="r" values="8;16;8" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx="82" cy="67" r="2" fill="#ffffff" />
              </g>

              {/* Télémétrie en temps réel */}
              <text x="18" y="24" fill="#a855f7" fontSize="7" fontFamily="monospace">
                Δ OFFSET : 0.08 mm
              </text>
              <text x="18" y="110" fill="#34d399" fontSize="7" fontWeight="bold">
                VALIDÉ : CONTACT INTÉRIEUR FIL
              </text>
            </g>

            {/* Badge Ultra */}
            <text x="97" y="180" fill="#c084fc" fontSize="8" fontWeight="bold" textAnchor="middle">
              🔬 Précision Chirurgicale 0,1 mm
            </text>
          </g>
        </svg>
      </div>

      <div className="mt-2 p-2 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center justify-between text-[11px]">
        <span className="text-slate-300">
          Résolution sélectionnée : <strong className="text-purple-300">{selectedRes} px</strong>
        </span>
        <span className="text-slate-400 text-[10px]">
          {selectedRes === '800' && 'Fluide & peu gourmand, idéal smartphones classiques.'}
          {selectedRes === '1024' && 'Recommandé : parfait équilibre fluidité et précision sur fil.'}
          {selectedRes === '1600' && 'Sub-millimétrique pour webcams 4K & smartphones haut de gamme.'}
        </span>
      </div>
    </div>
  );
}

