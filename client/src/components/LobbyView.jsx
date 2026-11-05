import React, { useState } from 'react';
import { Users, Swords, Edit3, Target, Radio, Copy, Check, Shield, Bot, User, LogIn, LogOut, Play, BarChart3, Flame, Trophy, Volume2, VolumeX, Sliders, Lock, Key } from 'lucide-react';
import { BOT_LEVELS } from '../utils/botEngine';
import { getVoiceMuted, toggleVoiceMute } from '../utils/soundEffects';
import VoiceSettingsModal from './VoiceSettingsModal';
import AccountModal from './AccountModal';

export default function LobbyView({
  currentUser,
  users,
  onUpdateUsername,
  onSendChallenge,
  incomingChallenge,
  onAcceptChallenge,
  onDeclineChallenge,
  onStartBotMatch,
  onStartSoloMatch,
  onOpenAuth,
  onOpenAdmin,
  onOpenStats,
  onOpenTournament,
  onLogout,
  backendUrl,
  onUserUpdated
}) {
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [selectedGameType, setSelectedGameType] = useState('501');
  const [copiedLink, setCopiedLink] = useState(false);
  const [playMode, setPlayMode] = useState('online'); // 'online' | 'bot' | 'solo'
  const [selectedBotLevel, setSelectedBotLevel] = useState('pro'); // 'amateur' | 'pro' | 'master'
  const [selectedBestOf, setSelectedBestOf] = useState(3); // 3 | 5 | 7
  const [selectedSoloLegs, setSelectedSoloLegs] = useState(1); // 1 | 2 | 3 | 4 | 5
  const [isVoiceMuted, setIsVoiceMuted] = useState(() => getVoiceMuted());
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  const handleToggleMute = () => {
    setShowVoiceModal(true);
  };

  const startEdit = () => {
    setEditedName(currentUser.username);
    setIsEditingName(true);
  };

  const handleSaveName = (e) => {
    e.preventDefault();
    if (editedName.trim().length > 0) {
      onUpdateUsername(editedName.trim());
      setIsEditingName(false);
    }
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const otherUsers = users.filter(u => u.id !== currentUser.id);

  return (
    <div className="flex flex-col h-[100dvh] max-h-[100dvh] w-full max-w-lg sm:max-w-xl mx-auto bg-slate-950 text-slate-100 px-3 py-2 pt-safe pb-safe overflow-y-auto select-none">
      {/* Brand Header */}
      <header className="flex items-center justify-between py-2 border-b border-slate-800/80 mb-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
            <Target className="w-5 h-5 text-slate-950 font-black" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5 leading-tight">
              DARTSMA <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded-full font-bold">PRO</span>
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-400 leading-none">Matchs live, tournois & détection caméra</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleToggleMute}
            className={`p-2 rounded-xl border transition active:scale-95 ${
              isVoiceMuted
                ? 'bg-rose-950/80 border-rose-500/50 text-rose-400'
                : 'bg-slate-800 border-slate-700 text-emerald-400 hover:text-emerald-300'
            }`}
            title={isVoiceMuted ? 'Activer la voix' : 'Couper la voix (Mute)'}
          >
            {isVoiceMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {currentUser?.email ? (
            <button
              onClick={onLogout}
              className="p-2 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-rose-400 transition"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1 transition shadow active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5" />
              Connexion
            </button>
          )}
        </div>
      </header>

      {/* Centered Navigation Menu Bar with Smooth Touch Scrolling for Mobile/Tablet */}
      <div className="flex items-center justify-start sm:justify-center gap-2 mb-3 overflow-x-auto scrollbar-none py-1 -mx-1 px-1">
        <button
          onClick={onOpenTournament}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-emerald-500/20 hover:from-amber-500/30 hover:to-emerald-500/30 text-amber-300 border border-amber-500/40 text-xs font-black flex items-center gap-1.5 transition shadow active:scale-95 shrink-0"
          title="Accéder au Grand Tournoi DartsMa Live"
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>Tournoi</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </button>

        <button
          onClick={onOpenStats}
          className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-black flex items-center gap-1.5 transition shadow active:scale-95 shrink-0"
          title="Consulter mes statistiques"
        >
          <BarChart3 className="w-4 h-4 text-emerald-400" />
          <span>Stats</span>
        </button>

        {currentUser?.email && (
          <button
            onClick={() => setShowAccountModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-black flex items-center gap-1.5 transition shadow active:scale-95 shrink-0"
            title="Mon compte et modification de mot de passe"
          >
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Mon Compte</span>
          </button>
        )}

        {currentUser?.role === 'admin' && (
          <button
            onClick={onOpenAdmin}
            className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-black flex items-center gap-1.5 transition shadow active:scale-95 shrink-0"
            title="Panneau de gestion Administrateur"
          >
            <Shield className="w-4 h-4 text-amber-400" />
            <span>Admin</span>
          </button>
        )}
      </div>

      {/* User Profile Card */}
      <section className="bg-slate-900/90 rounded-xl border border-slate-800 p-2.5 sm:p-3 mb-3 shadow-lg shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 font-bold text-base shrink-0">
              {currentUser?.username ? currentUser.username.charAt(0).toUpperCase() : 'P'}
            </div>

            <div className="min-w-0">
              {isEditingName ? (
                <form onSubmit={handleSaveName} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    maxLength={16}
                    className="bg-slate-800 border border-emerald-500/50 rounded-lg px-2 py-0.5 text-xs text-white font-bold focus:outline-none w-28"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-2 py-0.5 bg-emerald-600 text-slate-950 font-bold text-[10px] rounded"
                  >
                    OK
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black text-white truncate">{currentUser?.username}</span>
                  {!currentUser?.email && (
                    <button
                      onClick={startEdit}
                      className="p-1 rounded text-slate-400 hover:text-emerald-400 transition"
                      title="Modifier pseudo"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  )}
                  {currentUser?.role === 'admin' && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 rounded font-black shrink-0">
                      ADMIN
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-[10px] text-slate-400 truncate">
                  {currentUser?.email ? currentUser.email : 'En attente dans le lobby'}
                </span>
              </div>
            </div>
          </div>

          {/* Game format toggle (501 / 301) */}
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 shrink-0">
            <button
              onClick={() => setSelectedGameType('501')}
              className={`px-2.5 py-1 rounded text-[11px] font-black transition-all ${
                selectedGameType === '501' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              501
            </button>
            <button
              onClick={() => setSelectedGameType('301')}
              className={`px-2.5 py-1 rounded text-[11px] font-black transition-all ${
                selectedGameType === '301' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              301
            </button>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div
          onClick={onOpenStats}
          className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] cursor-pointer hover:opacity-90 transition group"
        >
          <div className="flex items-center gap-3">
            <span className="text-slate-400 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" />
              Victoires : <b className="text-white font-mono">{currentUser?.stats?.matchesWon || 0}</b>
            </span>
            <span className="text-slate-400 flex items-center gap-1">
              <Flame className="w-3 h-3 text-emerald-400" />
              Moyenne totale : <b className="text-emerald-400 font-mono">{currentUser?.stats?.averagePerMatch ? Number(Math.min(60, currentUser.stats.averagePerMatch)).toFixed(2) : '0.00'}</b>
            </span>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold group-hover:underline">
            Voir détails →
          </span>
        </div>
      </section>

      {/* Mode Selector Tabs (Online vs Bot vs Solo) */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800 mb-3 shrink-0">
        <button
          onClick={() => setPlayMode('online')}
          className={`py-2 rounded-lg text-[11px] font-black flex items-center justify-center gap-1 transition-all ${
            playMode === 'online'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          En Ligne
        </button>
        <button
          onClick={() => setPlayMode('bot')}
          className={`py-2 rounded-lg text-[11px] font-black flex items-center justify-center gap-1 transition-all ${
            playMode === 'bot'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          Vs IA
        </button>
        <button
          onClick={() => setPlayMode('solo')}
          className={`py-2 rounded-lg text-[11px] font-black flex items-center justify-center gap-1 transition-all ${
            playMode === 'solo'
              ? 'bg-blue-500 text-slate-950 shadow-md shadow-blue-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          Solo
        </button>
      </div>

      {/* Mode: BOT SELECTION */}
      {playMode === 'bot' && (
        <section className="bg-slate-900/90 rounded-xl border border-slate-800 p-3.5 space-y-3 animate-in fade-in shrink-0">
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-amber-400" />
              Niveau de l'ordinateur
            </h3>
            <p className="text-[11px] text-slate-400">Le bot s'adapte à votre niveau avec tir au bull préalable</p>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {Object.entries(BOT_LEVELS).map(([key, bot]) => {
              const isSelected = selectedBotLevel === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedBotLevel(key)}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500 ring-1 ring-amber-400 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-black text-[11px] text-white capitalize">{bot.name}</div>
                  <div className="text-[10px] text-amber-400 mt-0.5">{bot.badge}</div>
                </button>
              );
            })}
          </div>

          {/* Best of format for bot */}
          <div className="pt-1">
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              Format du match (Manches gagnantes) :
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[3, 5, 7].map((bo) => (
                <button
                  key={bo}
                  type="button"
                  onClick={() => setSelectedBestOf(bo)}
                  className={`py-1.5 rounded-lg text-xs font-black border transition ${
                    selectedBestOf === bo
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Best of {bo} <span className="text-[9px] block font-normal opacity-80">(1er à {Math.ceil(bo / 2)})</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => onStartBotMatch(selectedBotLevel, selectedGameType, selectedBestOf)}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950" />
            Lancer le match contre l'IA ({selectedGameType} - Best of {selectedBestOf})
          </button>
        </section>
      )}

      {/* Mode: SOLO PRACTICE (Choix de 1 à 5 legs) */}
      {playMode === 'solo' && (
        <section className="bg-slate-900/90 rounded-xl border border-slate-800 p-3.5 space-y-3 animate-in fade-in shrink-0">
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-400" />
              Entraînement Solo sur votre cible
            </h3>
            <p className="text-[11px] text-slate-400">
              Choisissez le nombre de manches à enchaîner pour vous entraîner.
            </p>
          </div>

          {/* Number of Legs Selector: 1 to 5 */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-300">
              Nombre de manches (legs) :
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setSelectedSoloLegs(num)}
                  className={`py-2 rounded-lg font-black text-xs border transition ${
                    selectedSoloLegs === num
                      ? 'bg-blue-500 text-slate-950 border-blue-400 shadow-md shadow-blue-500/20'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {num} {num === 1 ? 'leg' : 'legs'}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => onStartSoloMatch(selectedGameType, selectedSoloLegs)}
            className="w-full py-2.5 bg-blue-500 hover:bg-blue-400 text-slate-950 font-black text-xs rounded-xl transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950" />
            Démarrer l'entraînement ({selectedGameType} - {selectedSoloLegs} leg{selectedSoloLegs > 1 ? 's' : ''})
          </button>
        </section>
      )}

      {/* Mode: ONLINE LOBBY (Best of 3, 5, 7) */}
      {playMode === 'online' && (
        <section className="flex-1 flex flex-col min-h-0 space-y-2">
          {/* Format Selector for Online Challenges */}
          <div className="bg-slate-900/70 border border-slate-800 p-2.5 rounded-xl shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-300">Format des défis envoyés :</span>
              <span className="text-[10px] text-emerald-400 font-bold">Premier à {Math.ceil(selectedBestOf / 2)} legs</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[3, 5, 7].map((bo) => (
                <button
                  key={bo}
                  type="button"
                  onClick={() => setSelectedBestOf(bo)}
                  className={`py-1 rounded-lg text-xs font-black border transition ${
                    selectedBestOf === bo
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Best of {bo}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between shrink-0">
            <h2 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              SALLE D'ATTENTE ({otherUsers.length})
            </h2>
            <button
              onClick={copyRoomLink}
              className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
            >
              {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copiedLink ? 'Copié !' : 'Inviter un ami'}
            </button>
          </div>

          {otherUsers.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-900/40 rounded-xl border border-dashed border-slate-800 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-800/60 flex items-center justify-center text-slate-500 mb-2">
                <Radio className="w-6 h-6 animate-pulse text-emerald-500" />
              </div>
              <p className="text-xs font-bold text-slate-300 mb-0.5">Aucun joueur dans la salle d'attente</p>
              <p className="text-[11px] text-slate-400 max-w-xs mb-3">
                Ouvrez cette adresse sur votre téléphone ou invitez un partenaire pour démarrer un match à deux.
              </p>
              <button
                onClick={copyRoomLink}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg transition shadow flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                Copier l'adresse de connexion
              </button>
            </div>
          ) : (
            <div className="space-y-1.5 overflow-y-auto flex-1 pr-0.5">
              {otherUsers.map((user) => {
                const isAvailable = user.status === 'idle';
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800/80 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-300 shrink-0">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                          {user.username}
                          {user.role === 'admin' && (
                            <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1 rounded">Admin</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px]">
                          <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                          <span className={isAvailable ? 'text-emerald-400' : 'text-amber-400'}>
                            {isAvailable ? 'Prêt à jouer' : 'En match'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onSendChallenge(user.id, selectedGameType, selectedBestOf)}
                      disabled={!isAvailable}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 transition-all active:scale-95 shrink-0 ${
                        isAvailable
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Swords className="w-3 h-3" />
                      Défier (BO{selectedBestOf})
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Incoming Challenge Modal */}
      {incomingChallenge && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl p-5 max-w-xs w-full text-center shadow-2xl space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <Swords className="w-6 h-6 animate-bounce" />
            </div>

            <div>
              <h3 className="text-base font-black text-white">DÉFI REÇU !</h3>
              <p className="text-xs text-slate-300 mt-1">
                <span className="font-bold text-emerald-400">{incomingChallenge.from.username}</span> vous défie en{' '}
                <span className="font-bold text-white">{incomingChallenge.gameType}</span> (Best of {incomingChallenge.bestOf || 3}) !
              </p>
              <div className="text-[11px] text-amber-400 mt-1 font-bold">
                Tir au Bull préalable pour décider du début
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={onDeclineChallenge}
                className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                Refuser
              </button>
              <button
                onClick={onAcceptChallenge}
                className="py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition shadow-lg shadow-emerald-500/25"
              >
                Accepter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice & Sound Settings Modal */}
      <VoiceSettingsModal
        isOpen={showVoiceModal}
        onClose={() => {
          setShowVoiceModal(false);
          setIsVoiceMuted(getVoiceMuted());
        }}
      />

      {/* Mon Compte Personnel & Modification de Mot de passe */}
      <AccountModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        currentUser={currentUser}
        backendUrl={backendUrl}
        onUserUpdated={onUserUpdated}
      />
    </div>
  );
}
