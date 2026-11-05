import React, { useState, useEffect } from 'react';
import { 
  X, Smartphone, QrCode, Copy, Check, ExternalLink, 
  Wifi, HelpCircle, Sparkles, CheckCircle2, ShieldCheck, Zap, 
  AlertTriangle, Settings2 
} from 'lucide-react';
import CameraTutorialModal from './CameraTutorialModal';

export default function CompanionConnectModal({ 
  isOpen, 
  onClose, 
  roomId, 
  connectedCompanion 
}) {
  const [copied, setCopied] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showIpConfig, setShowIpConfig] = useState(false);
  
  // Local IP management (replaces localhost for smartphone scanning)
  const [hostIp, setHostIp] = useState(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        return window.location.hostname;
      }
    }
    return '192.168.1.51'; // Detected Wi-Fi fallback
  });
  const [availableIps, setAvailableIps] = useState([]);

  useEffect(() => {
    fetch('/api/network-info')
      .then((res) => res.json())
      .then((data) => {
        if (data?.ips && data.ips.length > 0) {
          setAvailableIps(data.ips);
        }
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          if (data?.primaryIp) {
            setHostIp(data.primaryIp);
          }
        }
      })
      .catch(() => {});
  }, []);

  if (!isOpen) return null;

  const port = window.location.port ? `:${window.location.port}` : '';
  const protocol = window.location.protocol || 'https:';
  const companionOrigin = `${protocol}//${hostIp}${port}`;
  const companionUrl = `${companionOrigin}/?companion=${encodeURIComponent(roomId)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(companionUrl)}&bgcolor=090d16&color=10b981&margin=4`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(companionUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-60 animate-in fade-in overflow-hidden"
      style={{
        paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0.5rem))',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0.5rem))',
        paddingLeft: 'max(0.5rem, env(safe-area-inset-left, 0.5rem))',
        paddingRight: 'max(0.5rem, env(safe-area-inset-right, 0.5rem))'
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg h-full max-h-[96dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-800 bg-slate-900/95 shrink-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5 truncate">
                <span>Caméra Satellite Déportée</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold shrink-0">Capteur 2</span>
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">Connectez un smartphone ou une tablette en Wi-Fi</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer shrink-0"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 min-h-0 text-slate-300 text-xs">
          {/* Status banner */}
          <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${
            connectedCompanion 
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' 
              : 'bg-slate-950/60 border-slate-800 text-slate-300'
          }`}>
            <div className={`w-3 h-3 rounded-full shrink-0 ${
              connectedCompanion ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'
            }`} />
            <div className="min-w-0 flex-1">
              <div className="font-bold text-white text-xs truncate">
                {connectedCompanion 
                  ? `Connecté : ${connectedCompanion.deviceName || 'Caméra Satellite'}` 
                  : 'En attente de connexion du smartphone...'}
              </div>
              <p className="text-[10px] text-slate-400">
                {connectedCompanion 
                  ? 'Prêt : le motion capture du smartphone transmet chaque flèche en direct.' 
                  : 'Scannez le QR code ci-dessous avec votre iPhone ou smartphone Android.'}
              </p>
            </div>
          </div>

          {/* QR Code Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 flex flex-col items-center justify-center space-y-2.5 shadow-inner">
            <div className="w-48 h-48 sm:w-52 sm:h-52 rounded-xl overflow-hidden bg-slate-950 p-2 border border-emerald-500/40 shadow-xl flex items-center justify-center relative group">
              <img 
                src={qrCodeUrl} 
                alt="QR Code Caméra Satellite" 
                className="w-full h-full object-contain rounded-lg"
              />
            </div>

            <div className="text-center space-y-1">
              <p className="font-black text-white text-xs flex items-center justify-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                Scannez avec l'appareil photo du smartphone
              </p>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-400 font-mono">
                <Wifi className="w-3 h-3" />
                <span>Réseau Wi-Fi : {hostIp}{port}</span>
              </div>
            </div>
          </div>

          {/* SSL Certificate Notice for Mobile Browsers */}
          <div className="p-2.5 bg-amber-950/30 border border-amber-500/40 rounded-xl text-[11px] text-amber-200/90 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span>Important lors du 1er scan sur mobile :</span>
            </div>
            <p className="text-[10px] text-amber-200/80 leading-relaxed">
              1. Votre téléphone doit être connecté au <strong>même réseau Wi-Fi</strong> que ce PC.<br />
              2. Si votre navigateur affiche <em>« Connexion non privée »</em>, appuyez sur <strong>« Paramètres avancés »</strong> puis <strong>« Continuer vers le site (non sécurisé) »</strong> pour autoriser le flux vidéo local.
            </p>
          </div>

          {/* Direct Link Copy Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Lien direct à ouvrir sur le smartphone :
              </label>
              <button
                type="button"
                onClick={() => setShowIpConfig(!showIpConfig)}
                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <Settings2 className="w-3 h-3" />
                <span>{showIpConfig ? 'Masquer IP' : 'Changer IP'}</span>
              </button>
            </div>

            {showIpConfig && (
              <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 animate-in fade-in">
                <label className="text-[10px] text-slate-400 block">Adresse IP de votre PC sur le réseau Wi-Fi :</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={hostIp}
                    onChange={(e) => setHostIp(e.target.value.trim())}
                    placeholder="192.168.1.51"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono outline-none focus:border-emerald-500"
                  />
                  {availableIps.length > 0 && (
                    <select
                      onChange={(e) => setHostIp(e.target.value)}
                      value={hostIp}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 text-xs text-slate-300 font-mono"
                    >
                      {availableIps.map((ip, i) => (
                        <option key={i} value={ip.address}>
                          {ip.name} ({ip.address})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl p-1.5">
              <input
                type="text"
                readOnly
                value={companionUrl}
                className="bg-transparent text-[11px] text-slate-200 font-mono flex-1 outline-none px-2 select-all truncate"
              />
              <button
                onClick={handleCopyLink}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer ${
                  copied 
                    ? 'bg-emerald-500 text-slate-950' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copié !' : 'Copier'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between shrink-0 gap-2">
          <button
            onClick={() => setShowTutorial(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Guide de positionnement</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition shadow cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>

      <CameraTutorialModal
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    </div>
  );
}
