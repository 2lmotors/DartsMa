import React, { useState } from 'react';
import { 
  X, Camera, Smartphone, Target, Sparkles, CheckCircle2, 
  HelpCircle, ArrowRight, ArrowLeft, Lightbulb, Compass, Zap 
} from 'lucide-react';
import { 
  PositioningAnimation, 
  CompanionAnimation, 
  CalibrationAnimation, 
  ResolutionAnimation 
} from './CameraTutorialAnimations';

export default function CameraTutorialModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('positioning'); // 'positioning' | 'companion' | 'calibration' | 'resolution'

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 z-60 animate-in fade-in overflow-hidden"
      style={{
        paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0.5rem))',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0.5rem))',
        paddingLeft: 'max(0.5rem, env(safe-area-inset-left, 0.5rem))',
        paddingRight: 'max(0.5rem, env(safe-area-inset-right, 0.5rem))'
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl h-full max-h-[96dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-800 bg-slate-900/95 shrink-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base md:text-lg font-black text-white flex items-center gap-1.5 truncate">
                <span>Tutoriel Caméra & Motion Capture</span>
                <span className="text-[9px] sm:text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-bold shrink-0">DartsMa Vision</span>
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">Guide de positionnement, calibrage de précision et caméra satellite</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer shrink-0"
            title="Fermer le tutoriel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1.5 gap-1 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('positioning')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'positioning' 
                ? 'bg-emerald-500 text-slate-950 shadow-md' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>1. Positionnement</span>
          </button>

          <button
            onClick={() => setActiveTab('companion')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'companion' 
                ? 'bg-emerald-500 text-slate-950 shadow-md' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>2. Caméra Satellite</span>
          </button>

          <button
            onClick={() => setActiveTab('calibration')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'calibration' 
                ? 'bg-emerald-500 text-slate-950 shadow-md' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>3. Calibrage & Segments</span>
          </button>

          <button
            onClick={() => setActiveTab('resolution')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'resolution' 
                ? 'bg-emerald-500 text-slate-950 shadow-md' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>4. Résolution HD</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 min-h-0 text-slate-200 text-xs sm:text-sm">
          
          {/* TAB 1: POSITIONING */}
          {activeTab === 'positioning' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-3 sm:p-4">
                <h3 className="text-base font-black text-white flex items-center gap-2 mb-2">
                  <Compass className="w-4 h-4 text-emerald-400" />
                  Où et comment positionner la caméra ?
                </h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Le système de motion capture DartsMa analyse les différences d'images à haute cadence pour trianguler l'impact de chaque flèche. Un positionnement soigné assure une précision chirurgicale sur les doubles et les triples.
                </p>
              </div>

              {/* Animation Démonstration Visuelle du Positionnement */}
              <PositioningAnimation />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-1.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xs">1</div>
                  <h4 className="font-bold text-white text-xs">Hauteur optimale</h4>
                  <p className="text-[11px] text-slate-400">
                    Alignez l'objectif à la hauteur du centre de la cible (<strong>1,73 m</strong> du sol) ou légèrement surélevé (jusqu'à 2,00 m avec une inclinaison vers le bas de 10° à 15°).
                  </p>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-1.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-xs">2</div>
                  <h4 className="font-bold text-white text-xs">Distance & Angle</h4>
                  <p className="text-[11px] text-slate-400">
                    Placez la caméra entre <strong>1,5 m et 2,5 m</strong> de la cible. Un angle de face (ou à <strong>30°-45°</strong> sur trépied) évite que le corps du joueur n'occulte la cible au moment du lâcher.
                  </p>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-1.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-xs">3</div>
                  <h4 className="font-bold text-white text-xs">Éclairage sans ombre</h4>
                  <p className="text-[11px] text-slate-400">
                    Privilégiez un anneau lumineux LED circulaire (type couronne de cible). Un éclairage uniforme sans ombres dures portées par les fléchettes garantit la meilleure détection.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/40 border border-dashed border-slate-800 rounded-xl p-3 flex items-start gap-2.5 text-xs text-slate-400">
                <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Astuce Pro :</strong> Fixez votre smartphone sur un trépied ou un support magnétique mural stable. Évitez toute vibration ou oscillation du support pendant les lancers.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COMPANION SATELLITE */}
          {activeTab === 'companion' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-blue-500/30 rounded-2xl p-3 sm:p-4">
                <h3 className="text-base font-black text-white flex items-center gap-2 mb-2">
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  Mode Caméra Satellite (Multi-Appareils)
                </h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Transformez un smartphone ou un iPad en <strong>capteur optique dédié</strong> orienté sur la cible, pendant que votre PC portable, TV ou tablette principale reste au pas de tir pour afficher le match.
                </p>
              </div>

              {/* Animation Démonstration Visuelle Caméra Satellite */}
              <CompanionAnimation />

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">1</span>
                  <div>
                    <h4 className="font-bold text-white text-xs">Lancer la partie sur l'appareil maître</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Sur votre écran principal (PC, tablette au pas de tir), lancez votre match (Solo, Bot ou Adversaire en ligne).</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">2</span>
                  <div>
                    <h4 className="font-bold text-white text-xs">Cliquer sur « 📡 Caméra Satellite »</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Un QR code et un lien de connexion instantanée apparaissent à l'écran.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">3</span>
                  <div>
                    <h4 className="font-bold text-white text-xs">Scanner avec le smartphone caméra</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Le 2ème appareil s'ouvre directement en <strong>mode capteur</strong> (sans mot de passe). Il filme la cible, calibre l'araignée et transmet les fléchettes en temps réel avec synchronisation sonore.</p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Ce mode n'interrompt pas votre connexion et n'affiche que la cible pour des performances maximales.</span>
              </div>
            </div>
          )}

          {/* TAB 3: CALIBRATION & SEGMENTS */}
          {activeTab === 'calibration' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-3 sm:p-4">
                <h3 className="text-base font-black text-white flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-amber-400" />
                  Calibrage pas-à-pas & Segments Illuminés
                </h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  L'araignée virtuelle doit épouser fidèlement les fils métalliques de votre cible réelle.
                </p>
              </div>

              {/* Animation Démonstration Visuelle du Calibrage & Segments */}
              <CalibrationAnimation />

              <div className="space-y-2">
                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <strong className="text-yellow-300 font-bold text-xs">1. Bouton « Point Zéro »</strong>
                  <p className="text-[11px] text-slate-400 mt-0.5">Cliquez sur « Point Zéro » pour centrer les axes X et Y à 50% et réinitialiser l'angle à 0°.</p>
                </div>

                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <strong className="text-yellow-300 font-bold text-xs">2. Activer le « Gabarit Cible ON »</strong>
                  <p className="text-[11px] text-slate-400 mt-0.5">Le gabarit officiel affiche les lits colorés en transparence devant l'objectif pour vous guider.</p>
                </div>

                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <strong className="text-yellow-300 font-bold text-xs">3. Aligner le Bullseye central (Centre X / Y)</strong>
                  <p className="text-[11px] text-slate-400 mt-0.5">Ajustez les curseurs Position X et Position Y pour placer le centre rouge de l'araignée pile sur le Bullseye de votre cible.</p>
                </div>

                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <strong className="text-yellow-300 font-bold text-xs">4. Régler la Taille / Zoom</strong>
                  <p className="text-[11px] text-slate-400 mt-0.5">Ajustez le curseur Zoom pour que l'anneau extérieur jaune recouvre exactement le cercle de fil des doubles.</p>
                </div>

                <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <strong className="text-yellow-300 font-bold text-xs">5. Aligner le segment 20 et vérifier l'illumination</strong>
                  <p className="text-[11px] text-slate-400 mt-0.5">Réglez l'Orientation pour que le 20 soit à la verticale. <strong>Les segments doubles et triples s'illuminent en néon</strong> pour vous permettre de vérifier l'alignement précis du lit T20 et D20 !</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: RESOLUTION */}
          {activeTab === 'resolution' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/30 rounded-2xl p-3 sm:p-4">
                <h3 className="text-base font-black text-white flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  Qualité de Capture & Résolution HD
                </h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Augmentez la définition optique pour affiner la détection dans les lits étroits des triples (9,6 mm de large).
                </p>
              </div>

              {/* Animation Démonstration Visuelle de la Résolution HD */}
              <ResolutionAnimation />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-xs font-black text-emerald-400">800 px (HD Rapide)</div>
                  <p className="text-[11px] text-slate-400">
                    Idéal pour smartphones plus anciens ou tablettes modestes. Cadence d'image très fluide (60 fps).
                  </p>
                </div>

                <div className="p-3 bg-slate-950/80 border border-emerald-500/50 rounded-xl space-y-1 relative">
                  <span className="absolute top-2 right-2 text-[8px] bg-emerald-500 text-slate-950 font-black px-1.5 py-0.2 rounded">Recommandé</span>
                  <div className="text-xs font-black text-white">1024 px (Haute Précision)</div>
                  <p className="text-[11px] text-slate-300">
                    Le compromis parfait entre finesse de détection et consommation processeur. Recommandé sur iPhone et Android récents.
                  </p>
                </div>

                <div className="p-3 bg-slate-950/60 border border-purple-500/40 rounded-xl space-y-1">
                  <div className="text-xs font-black text-purple-400">1600 px (Ultra HD Max)</div>
                  <p className="text-[11px] text-slate-400">
                    Précision chirurgicale maximale. Réservé aux smartphones récents et webcams 4K avec processeur performant.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3 text-xs text-slate-400">
                Vous pouvez modifier la résolution à tout moment directement depuis le sélecteur <strong className="text-white">Qualité</strong> dans la barre de calibrage de la caméra.
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between shrink-0 gap-2">
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            DartsMa Vision Multi-Capteurs
          </span>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => {
                if (activeTab === 'resolution') setActiveTab('calibration');
                else if (activeTab === 'calibration') setActiveTab('companion');
                else if (activeTab === 'companion') setActiveTab('positioning');
              }}
              disabled={activeTab === 'positioning'}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Précédent</span>
            </button>

            {activeTab !== 'resolution' ? (
              <button
                onClick={() => {
                  if (activeTab === 'positioning') setActiveTab('companion');
                  else if (activeTab === 'companion') setActiveTab('calibration');
                  else if (activeTab === 'calibration') setActiveTab('resolution');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition flex items-center gap-1 shadow cursor-pointer"
              >
                <span>Suivant</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition shadow cursor-pointer"
              >
                Compris !
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

