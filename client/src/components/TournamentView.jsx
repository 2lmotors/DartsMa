import React, { useState, useEffect } from 'react';
import { 
  Trophy, Users, Calendar, Award, Shield, CheckCircle2, AlertCircle, Clock, 
  Swords, Play, Send, RefreshCw, X, ChevronRight, Medal, Flame, Star, Sparkles,
  Lock, Unlock, ArrowLeft, Info, Mail
} from 'lucide-react';

export default function TournamentView({
  isOpen,
  onClose,
  currentUser,
  socket,
  backendUrl,
  users = [],
  onStartTournamentMatch
}) {
  const [tournament, setTournament] = useState(null);
  const [standings, setStandings] = useState([]);
  const [activeTab, setActiveTab] = useState('classement'); // 'classement' | 'mes_matchs' | 'calendrier' | 'finales' | 'prix' | 'admin'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [incomingTournChallenge, setIncomingTournChallenge] = useState(null);
  const [waitingChallengeMatchId, setWaitingChallengeMatchId] = useState(null);

  // Admin form state
  const [adminMaxPlayers, setAdminMaxPlayers] = useState(8);
  const [prizeFirst, setPrizeFirst] = useState('');
  const [prizeSecond, setPrizeSecond] = useState('');
  const [prizeThird, setPrizeThird] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  const getAdminId = () => {
    if (currentUser?.id) return currentUser.id;
    try {
      const stored = JSON.parse(localStorage.getItem('dartsma_user') || '{}');
      return stored.id || '';
    } catch (e) {
      return '';
    }
  };

  const fetchTournament = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/tournament/active`);
      const data = await res.json();
      if (data.success && data.tournament) {
        setTournament(data.tournament);
        setStandings(data.standings || []);
        setAdminMaxPlayers(data.tournament.maxPlayers || 8);
        setPrizeFirst(data.tournament.prizes?.first || '');
        setPrizeSecond(data.tournament.prizes?.second || '');
        setPrizeThird(data.tournament.prizes?.third || '');
      }
    } catch (err) {
      console.error('Erreur chargement tournoi :', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTournament();
    }
  }, [isOpen]);

  // Écouteurs Socket.io temps réel
  useEffect(() => {
    if (!socket) return;

    const handleTournamentUpdated = (data) => {
      if (data && data.tournament) {
        setTournament(data.tournament);
        setStandings(data.standings || []);
      }
    };

    const handleTournChallengeReceived = (challengeData) => {
      setIncomingTournChallenge(challengeData);
    };

    const handleTournChallengeDeclined = ({ username }) => {
      alert(`${username} a décliné le match de tournoi.`);
      setWaitingChallengeMatchId(null);
    };

    const handleTournChallengeError = ({ message }) => {
      alert(message);
      setWaitingChallengeMatchId(null);
    };

    socket.on('tournament:updated', handleTournamentUpdated);
    socket.on('tournament:challenge_received', handleTournChallengeReceived);
    socket.on('tournament:challenge_declined', handleTournChallengeDeclined);
    socket.on('tournament:challenge_error', handleTournChallengeError);

    return () => {
      socket.off('tournament:updated', handleTournamentUpdated);
      socket.off('tournament:challenge_received', handleTournChallengeReceived);
      socket.off('tournament:challenge_declined', handleTournChallengeDeclined);
      socket.off('tournament:challenge_error', handleTournChallengeError);
    };
  }, [socket]);

  if (!isOpen) return null;

  const isUserRegistered = tournament?.participants?.some(p => p.id === currentUser?.id);
  const onlineUserIds = new Set((users || []).map(u => u.id));

  // Inscription / Désinscription
  const handleRegister = async () => {
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`${backendUrl}/api/tournament/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: tournament.id, userId: currentUser.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'inscription');
      setTournament(data.tournament);
      setStandings(data.standings || []);
      setSuccessMsg('Félicitations, vous êtes inscrit au tournoi !');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUnregister = async () => {
    if (!window.confirm('Voulez-vous vraiment vous désinscrire du tournoi ?')) return;
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`${backendUrl}/api/tournament/unregister`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: tournament.id, userId: currentUser.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setTournament(data.tournament);
      setStandings(data.standings || []);
      setSuccessMsg('Votre désinscription a été enregistrée.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Envoi d'un défi pour un match de tournoi
  const handleSendMatchChallenge = (matchId, opponentId, isFinalMatch = false) => {
    if (!socket) return;
    setWaitingChallengeMatchId(matchId);
    socket.emit('tournament:send_challenge', {
      tournamentId: tournament.id,
      matchId,
      toUserId: opponentId,
      isFinalMatch
    });
  };

  // Réponse à un défi de tournoi reçu
  const handleRespondTournChallenge = (accepted) => {
    if (!socket || !incomingTournChallenge) return;
    socket.emit('tournament:respond_challenge', {
      challengeId: incomingTournChallenge.challengeId,
      accepted
    });
    setIncomingTournChallenge(null);
  };

  // Actions Administrateur
  const handleAdminStartTournament = async () => {
    if (!window.confirm(`Démarrer le tournoi avec la poule bloquée à ${adminMaxPlayers} joueurs ?\nToutes les confrontations seront générées.`)) return;
    setAdminLoading(true);
    setError('');
    try {
      const res = await fetch(`${backendUrl}/api/tournament/admin/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-id': getAdminId()
        },
        body: JSON.stringify({
          tournamentId: tournament.id,
          maxPlayersLimit: adminMaxPlayers
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur démarrage');
      setTournament(data.tournament);
      setStandings(data.standings || []);
      setSuccessMsg('Le tournoi a été lancé avec succès ! Les matchs de poule sont ouverts.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAdminSavePrizes = async (e) => {
    e.preventDefault();
    setAdminLoading(true);
    setError('');
    try {
      const res = await fetch(`${backendUrl}/api/tournament/admin/prizes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-id': getAdminId()
        },
        body: JSON.stringify({
          tournamentId: tournament.id,
          prizes: { first: prizeFirst, second: prizeSecond, third: prizeThird }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur sauvegarde prix');
      setTournament(data.tournament);
      setSuccessMsg('Les récompenses ont été mises à jour !');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAdminStartFinals = async () => {
    if (!window.confirm('Lancer la phase finale avec le Top 4 du classement (1er vs 4ème et 2ème vs 3ème) ?')) return;
    setAdminLoading(true);
    setError('');
    try {
      const res = await fetch(`${backendUrl}/api/tournament/admin/start-finals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-id': getAdminId()
        },
        body: JSON.stringify({ tournamentId: tournament.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lancement finales');
      setTournament(data.tournament);
      setStandings(data.standings || []);
      setSuccessMsg('Phase finale lancée avec succès ! Les demi-finales sont prêtes.');
      setActiveTab('finales');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAdminNotifyWinners = async () => {
    if (!window.confirm('Envoyer un email personnel officiel de félicitations et d\'attribution du prix aux 3 vainqueurs ?')) return;
    setAdminLoading(true);
    setError('');
    try {
      const res = await fetch(`${backendUrl}/api/tournament/admin/notify-winners`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-id': getAdminId()
        },
        body: JSON.stringify({
          tournamentId: tournament.id,
          adminNote: adminNote.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur envoi notifications');
      setSuccessMsg('Les 3 vainqueurs ont été informés personnellement de leurs prix par email !');
      fetchTournament();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAdminResetTournament = async () => {
    if (!window.confirm('Créer un tout nouveau tournoi vierge ? Le tournoi actuel sera archivé.')) return;
    setAdminLoading(true);
    setError('');
    try {
      const res = await fetch(`${backendUrl}/api/tournament/admin/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-id': getAdminId()
        },
        body: JSON.stringify({
          name: 'Grand Tournoi DartsMa Live - Nouvelle Édition',
          minPlayers: 6,
          maxPlayers: 16
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur reset');
      setTournament(data.tournament);
      setStandings(data.standings || []);
      setSuccessMsg('Nouveau tournoi créé et prêt pour les inscriptions !');
      setActiveTab('classement');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setAdminLoading(false);
    }
  };

  // Calcul du temps restant (1 semaine après startedAt)
  const calculateTimeRemaining = () => {
    if (!tournament?.deadlineAt) return null;
    const diff = new Date(tournament.deadlineAt) - Date.now();
    if (diff <= 0) return 'Délai d\'une semaine écoulé';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}j ${hours}h restants`;
  };

  // Mes matchs de poule
  const myPoolMatches = (tournament?.poolMatches || []).filter(m => 
    m.player1.id === currentUser?.id || m.player2.id === currentUser?.id
  );

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in select-none overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl h-full max-h-[96dvh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Banner Défi Tournoi Reçu */}
        {incomingTournChallenge && (
          <div className="bg-gradient-to-r from-amber-600 to-emerald-600 text-white p-3 px-4 flex items-center justify-between shadow-xl shrink-0 animate-bounce">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 shrink-0" />
              <div className="text-xs">
                <span className="font-black">{incomingTournChallenge.fromUsername}</span> vous défie pour votre match officiel de tournoi (Best of 5 legs) !
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleRespondTournChallenge(false)}
                className="px-2.5 py-1 rounded-lg bg-black/40 hover:bg-black/60 text-xs font-bold transition"
              >
                Décliner
              </button>
              <button
                onClick={() => handleRespondTournChallenge(true)}
                className="px-3 py-1 rounded-lg bg-white text-slate-950 text-xs font-black transition shadow hover:bg-slate-100"
              >
                Accepter le Match 🎯
              </button>
            </div>
          </div>
        )}

        {/* Top Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-800 bg-slate-900/95 shrink-0 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
              <Trophy className="w-6 h-6 font-black" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white truncate leading-tight">
                  {tournament?.name || 'Grand Tournoi DartsMa'}
                </h2>
                {tournament?.status === 'registration' && (
                  <span className="text-[10px] bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full font-bold shrink-0">
                    Inscriptions ({tournament.participants.length}/{tournament.maxPlayers})
                  </span>
                )}
                {tournament?.status === 'in_progress' && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold shrink-0 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Poule Active ({calculateTimeRemaining()})
                  </span>
                )}
                {tournament?.status === 'finals' && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold shrink-0">
                    🔥 Phase Finale (Top 4)
                  </span>
                )}
                {tournament?.status === 'completed' && (
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold shrink-0">
                    ✅ Tournoi Terminé
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 hidden xs:block truncate mt-0.5">
                Poule unique • Tous contre tous • Best of 5 legs (premier à 3) • 1 semaine max
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {tournament?.status === 'registration' && (
              isUserRegistered ? (
                <button
                  onClick={handleUnregister}
                  className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 text-xs font-bold transition active:scale-95"
                >
                  Me désinscrire
                </button>
              ) : (
                <button
                  onClick={handleRegister}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center gap-1"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>M'inscrire au Tournoi</span>
                </button>
              )
            )}

            <button
              onClick={fetchTournament}
              disabled={loading}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Rafraîchir"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages Feedback */}
        {successMsg && (
          <div className="bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs p-2.5 sm:p-3 mx-3 sm:mx-4 mt-3 rounded-2xl flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {error && (
          <div className="bg-rose-950/90 border border-rose-500/60 text-rose-300 text-xs p-2.5 sm:p-3 mx-3 sm:mx-4 mt-3 rounded-2xl flex items-start gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-2 px-3 sm:px-4 bg-slate-950/60 border-b border-slate-800 overflow-x-auto shrink-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('classement')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
              activeTab === 'classement'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Classement Poule</span>
          </button>

          <button
            onClick={() => setActiveTab('mes_matchs')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
              activeTab === 'mes_matchs'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Mes Matchs & Défis</span>
            {myPoolMatches.length > 0 && (
              <span className={`text-[10px] px-1.5 rounded-full font-black ${
                activeTab === 'mes_matchs' ? 'bg-slate-950 text-emerald-400' : 'bg-slate-800 text-slate-300'
              }`}>
                {myPoolMatches.filter(m => m.played).length}/{myPoolMatches.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('calendrier')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
              activeTab === 'calendrier'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Toutes les Rencontres</span>
          </button>

          <button
            onClick={() => setActiveTab('finales')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
              activeTab === 'finales'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Medal className="w-3.5 h-3.5" />
            <span>Phase Finale (Top 4)</span>
          </button>

          <button
            onClick={() => setActiveTab('prix')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
              activeTab === 'prix'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Prix & Récompenses</span>
          </button>

          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                activeTab === 'admin'
                  ? 'bg-amber-500 text-slate-950 shadow font-black'
                  : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Gestion Admin</span>
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 min-h-0">
          
          {/* TAB 1 : CLASSEMENT DE LA POULE */}
          {activeTab === 'classement' && (
            <div className="space-y-4">
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span>Classement Officiel de la Poule</span>
                    <span className="text-xs text-emerald-400 font-normal">
                      (Top 4 qualifiés pour les demi-finales)
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    <strong>Règle des points :</strong> Victoire = <strong>3 pts</strong> + 1 pt par leg gagnée (ex: 3-2 = <strong>6 pts</strong>). Défaite = <strong>1 pt par leg remportée</strong> (ex: 2 pts pour 2 legs remportées).
                  </p>
                </div>
                {tournament?.status === 'in_progress' && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-1.5 text-center shrink-0">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Temps pour jouer</div>
                    <div className="text-xs font-black text-emerald-400">{calculateTimeRemaining()}</div>
                  </div>
                )}
              </div>

              {standings.length === 0 ? (
                <div className="text-center py-12 text-slate-500 bg-slate-950/30 rounded-2xl border border-slate-800/80">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-40 text-emerald-400" />
                  <p className="text-sm font-bold text-slate-300">Aucun participant pour le moment</p>
                  <p className="text-xs text-slate-500 mt-1">Inscrivez-vous pour lancer la compétition !</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
                  <table className="w-full text-left text-xs text-slate-300 min-w-[560px]">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-3 text-center w-12">Rang</th>
                        <th className="p-3">Joueur</th>
                        <th className="p-3 text-center">J</th>
                        <th className="p-3 text-center text-emerald-400">V</th>
                        <th className="p-3 text-center text-rose-400">D</th>
                        <th className="p-3 text-center">L+</th>
                        <th className="p-3 text-center">L-</th>
                        <th className="p-3 text-center">Diff</th>
                        <th className="p-3 text-center font-black text-emerald-300 bg-emerald-950/30">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {standings.map((p, index) => {
                        const isMe = p.id === currentUser?.id;
                        const isTop4 = index < 4;
                        return (
                          <tr
                            key={p.id}
                            className={`transition ${
                              isMe ? 'bg-emerald-950/25 font-bold' : 'hover:bg-slate-850/40'
                            }`}
                          >
                            <td className="p-3 text-center font-bold">
                              {index === 0 && <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs">🥇</span>}
                              {index === 1 && <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-400/20 text-slate-200 border border-slate-400/40 text-xs">🥈</span>}
                              {index === 2 && <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/20 text-amber-600 border border-amber-700/40 text-xs">🥉</span>}
                              {index === 3 && <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs">4</span>}
                              {index >= 4 && <span className="text-slate-500">{index + 1}</span>}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className={`font-bold ${isMe ? 'text-emerald-400' : 'text-white'}`}>
                                  {p.username}
                                </span>
                                {isMe && (
                                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded-full">
                                    Moi
                                  </span>
                                )}
                                {isTop4 && (
                                  <span className="text-[9px] bg-amber-500/10 text-amber-300/80 px-1 rounded hidden sm:inline">
                                    Qualifié Top 4
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-center font-mono">{p.played}</td>
                            <td className="p-3 text-center font-mono text-emerald-400">{p.won}</td>
                            <td className="p-3 text-center font-mono text-rose-400">{p.lost}</td>
                            <td className="p-3 text-center font-mono">{p.legsWon}</td>
                            <td className="p-3 text-center font-mono">{p.legsLost}</td>
                            <td className={`p-3 text-center font-mono ${p.legDiff > 0 ? 'text-emerald-400' : p.legDiff < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                              {p.legDiff > 0 ? `+${p.legDiff}` : p.legDiff}
                            </td>
                            <td className="p-3 text-center font-mono font-black text-sm text-emerald-300 bg-emerald-950/20">
                              {p.points}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2 : MES MATCHS & DÉFIS DIRECTS */}
          {activeTab === 'mes_matchs' && (
            <div className="space-y-4">
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-3 sm:p-4">
                <h3 className="text-sm font-black text-white mb-1">Mes Matchs de Tournoi</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Vous devez affronter chaque participant de la poule une seule fois. Les défis se lancent <strong>exclusivement sur cette page</strong> dès que votre adversaire est connecté en ligne.
                </p>
              </div>

              {!isUserRegistered ? (
                <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800">
                  <Trophy className="w-10 h-10 mx-auto text-amber-400 mb-2 opacity-60" />
                  <p className="text-sm font-bold text-white mb-1">Vous n'êtes pas inscrit à ce tournoi</p>
                  <p className="text-xs text-slate-400 mb-4">Inscrivez-vous pour rejoindre la poule et défier les autres joueurs.</p>
                  {tournament?.status === 'registration' && (
                    <button
                      onClick={handleRegister}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg transition active:scale-95"
                    >
                      M'inscrire au Tournoi
                    </button>
                  )}
                </div>
              ) : myPoolMatches.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800">
                  <Clock className="w-10 h-10 mx-auto text-slate-500 mb-2" />
                  <p className="text-sm font-bold text-slate-300">En attente du lancement par l'administrateur</p>
                  <p className="text-xs text-slate-500 mt-1">Dès que le tournoi sera lancé, vos confrontations s'afficheront ici.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {myPoolMatches.map((m) => {
                    const opponent = m.player1.id === currentUser.id ? m.player2 : m.player1;
                    const isOpponentOnline = onlineUserIds.has(opponent.id);
                    const myScore = m.player1.id === currentUser.id ? m.score1 : m.score2;
                    const oppScore = m.player1.id === currentUser.id ? m.score2 : m.score1;
                    const isMyWin = m.winnerId === currentUser.id;

                    return (
                      <div
                        key={m.id}
                        className={`p-4 rounded-2xl border transition relative ${
                          m.played
                            ? isMyWin
                              ? 'bg-emerald-950/20 border-emerald-500/40'
                              : 'bg-rose-950/20 border-rose-500/40'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white">{opponent.username}</span>
                            {isOpponentOnline ? (
                              <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> En ligne
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500">⚪ Hors ligne</span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500">Best of 5</span>
                        </div>

                        {m.played ? (
                          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                            <div className="text-xs font-mono font-bold">
                              Score : <span className={isMyWin ? 'text-emerald-400' : 'text-slate-300'}>{myScore}</span> - <span className={!isMyWin ? 'text-rose-400' : 'text-slate-300'}>{oppScore}</span>
                            </div>
                            <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                              isMyWin ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}>
                              {isMyWin ? 'Victoire (6 pts)' : `Défaite (${myScore} pts)`}
                            </span>
                          </div>
                        ) : (
                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                            <span className="text-xs text-slate-400">Non joué</span>
                            {isOpponentOnline ? (
                              <button
                                onClick={() => handleSendMatchChallenge(m.id, opponent.id, false)}
                                disabled={waitingChallengeMatchId === m.id}
                                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center gap-1 disabled:opacity-50"
                              >
                                {waitingChallengeMatchId === m.id ? (
                                  <>
                                    <span className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                                    <span>Attente...</span>
                                  </>
                                ) : (
                                  <>
                                    <Swords className="w-3.5 h-3.5" />
                                    <span>Défier en Tournoi</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-500 italic">
                                En attente de connexion
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3 : TOUTES LES RENCONTRES (CALENDRIER) */}
          {activeTab === 'calendrier' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white">Toutes les Confrontations de la Poule</h3>
                <span className="text-xs text-slate-400 font-mono">
                  {(tournament?.poolMatches || []).filter(m => m.played).length} / {(tournament?.poolMatches || []).length} matchs disputés
                </span>
              </div>

              {(tournament?.poolMatches || []).length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800">
                  <Calendar className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                  <p className="text-sm font-bold text-slate-300">Les matchs ne sont pas encore générés</p>
                  <p className="text-xs text-slate-500 mt-1">L'administrateur génèrera le calendrier au démarrage de la poule.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {tournament.poolMatches.map((m) => {
                    return (
                      <div
                        key={m.id}
                        className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
                          m.played
                            ? 'bg-slate-950/60 border-slate-800 text-slate-300'
                            : 'bg-slate-900/60 border-slate-800/80 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`font-bold truncate ${m.winnerId === m.player1.id ? 'text-emerald-400' : 'text-slate-200'}`}>
                            {m.player1.username}
                          </span>
                          <span className="text-slate-600 font-mono">vs</span>
                          <span className={`font-bold truncate ${m.winnerId === m.player2.id ? 'text-emerald-400' : 'text-slate-200'}`}>
                            {m.player2.username}
                          </span>
                        </div>

                        <div className="shrink-0 font-mono font-bold">
                          {m.played ? (
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs">
                              {m.score1} - {m.score2}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">À jouer</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4 : PHASE FINALE (TOP 4) */}
          {activeTab === 'finales' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/30 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Medal className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-black text-white">Phase Finale à 4 Joueurs</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  À l'issue de la semaine de poule, les 4 premiers disputent les demi-finales (1er vs 4ème et 2ème vs 3ème). Les deux vainqueurs s'affrontent en <strong>Grande Finale</strong> pour la 1ère et 2ème place, et les deux perdants en <strong>Petite Finale</strong> pour la 3ème et 4ème place.
                </p>
              </div>

              {!tournament?.finals?.semiFinal1 ? (
                <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800">
                  <Lock className="w-10 h-10 mx-auto text-amber-500/50 mb-2" />
                  <p className="text-sm font-bold text-white mb-1">La phase finale n'est pas encore lancée</p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Terminez les matchs de la poule ou attendez la clôture par l'administrateur pour débloquer les demi-finales.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Demi-Finales */}
                  <div>
                    <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider mb-2.5 flex items-center gap-1.5">
                      <span>Étape 1 : Les Demi-Finales</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[tournament.finals.semiFinal1, tournament.finals.semiFinal2].map((sf) => {
                        if (!sf) return null;
                        const isPlayerInMatch = sf.player1.id === currentUser?.id || sf.player2.id === currentUser?.id;
                        const opponent = sf.player1.id === currentUser?.id ? sf.player2 : sf.player1;
                        const isOpponentOnline = onlineUserIds.has(opponent?.id);

                        return (
                          <div key={sf.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-3 border-b border-slate-850 pb-2">
                              <span className="font-bold text-white">{sf.title}</span>
                              <span className="font-mono">Best of 5</span>
                            </div>

                            <div className="space-y-2 mb-3">
                              <div className="flex items-center justify-between text-xs">
                                <span className={`font-bold ${sf.winnerId === sf.player1.id ? 'text-amber-400' : 'text-slate-300'}`}>
                                  #{sf.player1.rank} {sf.player1.username}
                                </span>
                                {sf.played && <span className="font-mono font-bold text-sm text-white">{sf.score1}</span>}
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className={`font-bold ${sf.winnerId === sf.player2.id ? 'text-amber-400' : 'text-slate-300'}`}>
                                  #{sf.player2.rank} {sf.player2.username}
                                </span>
                                {sf.played && <span className="font-mono font-bold text-sm text-white">{sf.score2}</span>}
                              </div>
                            </div>

                            {sf.played ? (
                              <div className="text-[11px] text-emerald-400 font-bold bg-emerald-950/40 p-2 rounded-xl text-center border border-emerald-500/30">
                                Qualifié pour la Grande Finale : {sf.winnerId === sf.player1.id ? sf.player1.username : sf.player2.username}
                              </div>
                            ) : isPlayerInMatch && isOpponentOnline ? (
                              <button
                                onClick={() => handleSendMatchChallenge(sf.id, opponent.id, true)}
                                className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition flex items-center justify-center gap-1.5 shadow"
                              >
                                <Swords className="w-3.5 h-3.5" />
                                <span>Lancer la Demi-Finale</span>
                              </button>
                            ) : (
                              <div className="text-[11px] text-slate-500 text-center italic py-1">
                                {isPlayerInMatch ? 'Adversaire hors ligne' : 'En attente du résultat'}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Finales (Grande et Petite) */}
                  <div>
                    <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider mb-2.5 flex items-center gap-1.5">
                      <span>Étape 2 : Les Finales (1ère, 2ème, 3ème et 4ème place)</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Grande Finale */}
                      <div className="bg-gradient-to-b from-amber-950/20 to-slate-950 border border-amber-500/50 rounded-2xl p-4">
                        <div className="flex items-center justify-between text-[11px] text-amber-400 mb-3 border-b border-slate-800 pb-2">
                          <span className="font-black flex items-center gap-1">
                            <Trophy className="w-3.5 h-3.5" /> Grande Finale (1ère & 2ème place)
                          </span>
                          <span className="font-mono">Best of 5</span>
                        </div>

                        {!tournament.finals.grandFinal ? (
                          <p className="text-xs text-slate-500 text-center py-4 italic">
                            En attente des vainqueurs des demi-finales
                          </p>
                        ) : (
                          <>
                            <div className="space-y-2 mb-3">
                              <div className="flex items-center justify-between text-xs">
                                <span className={`font-bold ${tournament.finals.grandFinal.winnerId === tournament.finals.grandFinal.player1.id ? 'text-amber-400' : 'text-slate-300'}`}>
                                  {tournament.finals.grandFinal.player1.username}
                                </span>
                                {tournament.finals.grandFinal.played && (
                                  <span className="font-mono font-bold text-sm text-white">{tournament.finals.grandFinal.score1}</span>
                                )}
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className={`font-bold ${tournament.finals.grandFinal.winnerId === tournament.finals.grandFinal.player2.id ? 'text-amber-400' : 'text-slate-300'}`}>
                                  {tournament.finals.grandFinal.player2.username}
                                </span>
                                {tournament.finals.grandFinal.played && (
                                  <span className="font-mono font-bold text-sm text-white">{tournament.finals.grandFinal.score2}</span>
                                )}
                              </div>
                            </div>

                            {tournament.finals.grandFinal.played ? (
                              <div className="text-xs text-amber-300 font-black bg-amber-500/20 p-2.5 rounded-xl text-center border border-amber-500/40">
                                🥇 CHAMPION DU TOURNOI : {tournament.winners?.first?.username}
                              </div>
                            ) : (
                              (tournament.finals.grandFinal.player1.id === currentUser?.id || tournament.finals.grandFinal.player2.id === currentUser?.id) && (
                                <button
                                  onClick={() => {
                                    const opp = tournament.finals.grandFinal.player1.id === currentUser?.id ? tournament.finals.grandFinal.player2 : tournament.finals.grandFinal.player1;
                                    handleSendMatchChallenge(tournament.finals.grandFinal.id, opp.id, true);
                                  }}
                                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow flex items-center justify-center gap-1.5"
                                >
                                  <Trophy className="w-4 h-4" /> Disputer la Grande Finale
                                </button>
                              )
                            )}
                          </>
                        )}
                      </div>

                      {/* Petite Finale */}
                      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-3 border-b border-slate-850 pb-2">
                          <span className="font-bold text-slate-200 flex items-center gap-1">
                            <Medal className="w-3.5 h-3.5 text-amber-600" /> Petite Finale (3ème place)
                          </span>
                          <span className="font-mono">Best of 5</span>
                        </div>

                        {!tournament.finals.smallFinal ? (
                          <p className="text-xs text-slate-500 text-center py-4 italic">
                            En attente des perdants des demi-finales
                          </p>
                        ) : (
                          <>
                            <div className="space-y-2 mb-3">
                              <div className="flex items-center justify-between text-xs">
                                <span className={`font-bold ${tournament.finals.smallFinal.winnerId === tournament.finals.smallFinal.player1.id ? 'text-amber-500' : 'text-slate-300'}`}>
                                  {tournament.finals.smallFinal.player1.username}
                                </span>
                                {tournament.finals.smallFinal.played && (
                                  <span className="font-mono font-bold text-sm text-white">{tournament.finals.smallFinal.score1}</span>
                                )}
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className={`font-bold ${tournament.finals.smallFinal.winnerId === tournament.finals.smallFinal.player2.id ? 'text-amber-500' : 'text-slate-300'}`}>
                                  {tournament.finals.smallFinal.player2.username}
                                </span>
                                {tournament.finals.smallFinal.played && (
                                  <span className="font-mono font-bold text-sm text-white">{tournament.finals.smallFinal.score2}</span>
                                )}
                              </div>
                            </div>

                            {tournament.finals.smallFinal.played ? (
                              <div className="text-xs text-amber-500 font-bold bg-amber-950/30 p-2.5 rounded-xl text-center border border-amber-600/40">
                                🥉 3ème Place du Tournoi : {tournament.winners?.third?.username}
                              </div>
                            ) : (
                              (tournament.finals.smallFinal.player1.id === currentUser?.id || tournament.finals.smallFinal.player2.id === currentUser?.id) && (
                                <button
                                  onClick={() => {
                                    const opp = tournament.finals.smallFinal.player1.id === currentUser?.id ? tournament.finals.smallFinal.player2 : tournament.finals.smallFinal.player1;
                                    handleSendMatchChallenge(tournament.finals.smallFinal.id, opp.id, true);
                                  }}
                                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
                                >
                                  Disputer la Petite Finale
                                </button>
                              )
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5 : PRIX & RÉCOMPENSES */}
          {activeTab === 'prix' && (
            <div className="space-y-6">
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-center">
                <Trophy className="w-12 h-12 mx-auto text-amber-400 mb-2 drop-shadow" />
                <h3 className="text-lg font-black text-white">Dotations & Récompenses Officielles</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Les 3 premiers du classement final recevront les récompenses décidées par l'administrateur, qui les informera personnellement de la remise de leur prix.
                </p>
              </div>

              {/* Podium si terminé */}
              {tournament?.winners && (
                <div className="bg-gradient-to-b from-amber-500/10 via-slate-900 to-slate-950 border border-amber-500/40 rounded-3xl p-6 text-center space-y-4">
                  <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider">
                    🎉 Podium Officiel Définitif
                  </h4>

                  <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-4">
                    {/* 2ème place */}
                    <div className="bg-slate-950 border border-slate-700 rounded-2xl p-3 flex flex-col items-center">
                      <span className="text-2xl mb-1">🥈</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">2ème Place</span>
                      <span className="text-sm font-black text-white truncate w-full mt-1">
                        {tournament.winners.second?.username}
                      </span>
                      <span className="text-[11px] text-amber-400 mt-2 font-medium">
                        {tournament.prizes?.second}
                      </span>
                    </div>

                    {/* 1ère place */}
                    <div className="bg-gradient-to-b from-amber-500/20 to-slate-950 border-2 border-amber-400 rounded-2xl p-4 flex flex-col items-center -translate-y-2 shadow-xl shadow-amber-500/20">
                      <span className="text-4xl mb-1">👑</span>
                      <span className="text-xs text-amber-300 font-black uppercase">Champion 1er</span>
                      <span className="text-base font-black text-white truncate w-full mt-1">
                        {tournament.winners.first?.username}
                      </span>
                      <span className="text-xs text-emerald-400 mt-2 font-black">
                        {tournament.prizes?.first}
                      </span>
                    </div>

                    {/* 3ème place */}
                    <div className="bg-slate-950 border border-amber-800/60 rounded-2xl p-3 flex flex-col items-center">
                      <span className="text-2xl mb-1">🥉</span>
                      <span className="text-[10px] text-amber-600 font-bold uppercase">3ème Place</span>
                      <span className="text-sm font-black text-white truncate w-full mt-1">
                        {tournament.winners.third?.username}
                      </span>
                      <span className="text-[11px] text-amber-400 mt-2 font-medium">
                        {tournament.prizes?.third}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Liste des Prix */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-slate-950 border border-amber-500/40 rounded-2xl p-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3 text-2xl font-black">
                    🥇
                  </div>
                  <h4 className="text-sm font-black text-white mb-1">1er Prix (Vainqueur)</h4>
                  <p className="text-xs text-emerald-400 font-bold leading-relaxed">
                    {tournament?.prizes?.first || 'Non défini'}
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-700 rounded-2xl p-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-400/20 text-slate-300 flex items-center justify-center mx-auto mb-3 text-2xl font-black">
                    🥈
                  </div>
                  <h4 className="text-sm font-black text-white mb-1">2ème Prix (Finaliste)</h4>
                  <p className="text-xs text-emerald-400 font-bold leading-relaxed">
                    {tournament?.prizes?.second || 'Non défini'}
                  </p>
                </div>

                <div className="bg-slate-950 border border-amber-700/40 rounded-2xl p-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-amber-700/20 text-amber-600 flex items-center justify-center mx-auto mb-3 text-2xl font-black">
                    🥉
                  </div>
                  <h4 className="text-sm font-black text-white mb-1">3ème Prix (Petite Finale)</h4>
                  <p className="text-xs text-emerald-400 font-bold leading-relaxed">
                    {tournament?.prizes?.third || 'Non défini'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6 : GESTION ADMIN (RÉSERVÉ ADMINISTRATEUR) */}
          {activeTab === 'admin' && currentUser?.role === 'admin' && (
            <div className="space-y-6">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3">
                <Shield className="w-6 h-6 text-amber-400 shrink-0" />
                <div>
                  <h3 className="text-sm font-black text-white">Panneau de Contrôle du Tournoi</h3>
                  <p className="text-xs text-slate-400">
                    Gérez les inscriptions (6 à 16 joueurs), démarrez la poule, lancez les finales et notifiez les vainqueurs.
                  </p>
                </div>
              </div>

              {/* 1. Blocage de la poule & Lancement */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-200 tracking-wider flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>1. Configuration des Joueurs & Démarrage de la Poule</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-bold">
                      Nombre maximum de joueurs pour la poule (6 à 16) :
                    </label>
                    <select
                      value={adminMaxPlayers}
                      onChange={(e) => setAdminMaxPlayers(parseInt(e.target.value))}
                      disabled={tournament?.status !== 'registration'}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none"
                    >
                      {[6, 8, 10, 12, 14, 16].map(n => (
                        <option key={n} value={n}>{n} Joueurs</option>
                      ))}
                    </select>
                  </div>

                  {tournament?.status === 'registration' ? (
                    <button
                      onClick={handleAdminStartTournament}
                      disabled={adminLoading || (tournament?.participants?.length || 0) < 6}
                      className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition flex items-center justify-center gap-1.5 shadow active:scale-95 disabled:opacity-50"
                    >
                      <Play className="w-4 h-4" />
                      <span>Bloquer la poule & Lancer le Tournoi</span>
                    </button>
                  ) : (
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-center text-xs text-emerald-400 font-bold">
                      ✓ Tournoi déjà lancé ({tournament?.participants?.length} participants)
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-500">
                  Actuellement : <strong>{tournament?.participants?.length || 0}</strong> inscrits sur minimum 6 requis.
                </p>
              </div>

              {/* 2. Édition des Dotations / Prix */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                <h4 className="text-xs font-black uppercase text-slate-200 tracking-wider mb-3 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>2. Définition des Prix des 3 Premiers</span>
                </h4>

                <form onSubmit={handleAdminSavePrizes} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-amber-300 mb-1">🥇 Prix 1ère Place :</label>
                    <input
                      type="text"
                      required
                      value={prizeFirst}
                      onChange={(e) => setPrizeFirst(e.target.value)}
                      placeholder="Ex: Trophée Or + 100€"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">🥈 Prix 2ème Place :</label>
                    <input
                      type="text"
                      required
                      value={prizeSecond}
                      onChange={(e) => setPrizeSecond(e.target.value)}
                      placeholder="Ex: Trophée Argent + Cible Pro"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-amber-600 mb-1">🥉 Prix 3ème Place :</label>
                    <input
                      type="text"
                      required
                      value={prizeThird}
                      onChange={(e) => setPrizeThird(e.target.value)}
                      placeholder="Ex: Trophée Bronze + Lot de fléchettes"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={adminLoading}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
                  >
                    Enregistrer les Prix
                  </button>
                </form>
              </div>

              {/* 3. Lancer la Phase Finale (Top 4) */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-200 tracking-wider flex items-center gap-1.5">
                  <Medal className="w-4 h-4 text-amber-400" />
                  <span>3. Lancement de la Phase Finale (Top 4)</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Prend les 4 premiers du classement de la poule et génère les demi-finales (1er vs 4ème et 2ème vs 3ème).
                </p>
                <button
                  onClick={handleAdminStartFinals}
                  disabled={adminLoading || tournament?.status === 'finals' || tournament?.status === 'completed'}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow active:scale-95 disabled:opacity-50"
                >
                  {tournament?.status === 'finals' ? 'Phase finale en cours' : 'Lancer les Demi-Finales du Top 4'}
                </button>
              </div>

              {/* 4. Notifier personnellement les 3 vainqueurs par email */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-200 tracking-wider flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <span>4. Informer Personnellement les 3 Vainqueurs par Email</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Envoie un email officiel avec félicitations, détail du prix remporté et votre message aux 3 premiers du tournoi.
                </p>

                <textarea
                  rows={2}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Message personnel de l'administrateur aux vainqueurs (facultatif)..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-medium"
                />

                <button
                  onClick={handleAdminNotifyWinners}
                  disabled={adminLoading || !tournament?.winners}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition shadow active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Envoyer l'Email Officiel aux 3 Vainqueurs</span>
                </button>
                {!tournament?.winners && (
                  <p className="text-[11px] text-amber-500/80 italic">
                    Actif dès que la Grande Finale et la Petite Finale sont terminées.
                  </p>
                )}
              </div>

              {/* 5. Réinitialiser / Nouveau Tournoi */}
              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <button
                  onClick={handleAdminResetTournament}
                  disabled={adminLoading}
                  className="px-3.5 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-xs font-bold transition"
                >
                  Créer une nouvelle édition du tournoi
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Tournoi Officiel DartsMa • Matchs Best of 5 legs</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
