import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Target, TrendingUp, Award, Flame, Calendar, Activity, CheckCircle2, XCircle, BarChart3, RefreshCw } from 'lucide-react';

export default function StatsView({ currentUser, onClose, backendUrl }) {
  const [stats, setStats] = useState(currentUser?.stats || null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/user/${currentUser.id}/stats`);
      const data = await res.json();
      if (res.ok && data.stats) {
        setStats(data.stats);
      }
    } catch (e) {
      console.warn('Error fetching stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [currentUser?.id]);

  const matchesPlayed = stats?.matchesPlayed || 0;
  const matchesWon = stats?.matchesWon || 0;
  const matchesLost = stats?.matchesLost || 0;
  const legsPlayed = stats?.legsPlayed || 0;
  const legsWon = stats?.legsWon || 0;
  const legsLost = stats?.legsLost || 0;

  const avgPerMatch = stats?.averagePerMatch ? Number(Math.min(60, stats.averagePerMatch)).toFixed(2) : '0.00';
  const avgPerDart = stats?.averagePerDart ? Number(Math.min(60, stats.averagePerDart)).toFixed(2) : '0.00';
  const winRate = matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0;
  const history = stats?.history || [];

  return (
    <div className="flex flex-col h-[100dvh] max-h-[100dvh] w-full max-w-2xl mx-auto bg-slate-950 text-slate-100 p-3 sm:p-5 pt-safe pb-safe overflow-hidden select-none">
      {/* Top Header */}
      <header className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 transition active:scale-95 shrink-0"
            title="Retour au lobby"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base md:text-lg font-black text-white flex items-center gap-1.5 sm:gap-2 truncate">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
              <span className="truncate">Statistiques de {currentUser?.username}</span>
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">Évolution de vos performances & historique</p>
          </div>
        </div>

        <button
          onClick={fetchStats}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition"
          title="Rafraîchir"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto space-y-3 pt-3 pr-0.5">
        {/* Key Highlights Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Average Total / Match */}
          <div className="bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/40 rounded-2xl p-3 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-400 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">Moyenne Totale</span>
              <Flame className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">{avgPerMatch}</div>
            <span className="text-[10px] text-slate-400 mt-1">Score / flèches (ex: 501 / 18)</span>
          </div>

          {/* Average per dart */}
          <div className="bg-gradient-to-br from-teal-950/40 to-slate-900 border border-teal-500/40 rounded-2xl p-3 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-teal-400 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">Moyenne par flèche</span>
              <Target className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">{avgPerDart}</div>
            <span className="text-[10px] text-slate-400 mt-1">Plafonnée à 60 max</span>
          </div>

          {/* Matches Won / Lost */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-400 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">Parties / Matchs</span>
              <Trophy className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-2xl font-black text-white">{matchesWon}</span>
              <span className="text-xs text-slate-500 font-bold">V</span>
              <span className="text-slate-600">/</span>
              <span className="text-xl font-bold text-rose-400">{matchesLost}</span>
              <span className="text-xs text-slate-500 font-bold">D</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">{matchesPlayed} match(s) joué(s)</span>
          </div>

          {/* Win Rate */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-blue-400 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">Taux de Victoire</span>
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">{winRate}%</div>
            <span className="text-[10px] text-slate-400 mt-1">Succès en duel</span>
          </div>
        </div>

        {/* Detailed Stats Cards */}
        <div className="grid grid-cols-2 gap-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-3 shadow">
          {/* Legs Details */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400">Total des Legs</span>
            <div className="text-lg font-black text-white">{legsPlayed} <span className="text-xs text-slate-500 font-normal">legs jouées</span></div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-emerald-400 font-bold">+{legsWon} gagnées</span>
              <span className="text-slate-600">|</span>
              <span className="text-rose-400 font-bold">-{legsLost} perdues</span>
            </div>
          </div>

          {/* Cumulative Throws */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400">Volume de Jeu</span>
            <div className="text-lg font-black text-white font-mono">{stats?.totalDartsThrown || 0} <span className="text-xs text-slate-500 font-normal">flèches</span></div>
            <div className="text-xs text-slate-300">
              <b className="text-emerald-400 font-mono">{stats?.totalPointsScored || 0}</b> points marqués
            </div>
          </div>
        </div>

        {/* Match History Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              Historique des Matchs ({history.length})
            </h2>
            <span className="text-[10px] text-slate-500">Mise à jour automatique</span>
          </div>

          {history.length === 0 ? (
            <div className="p-6 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl text-center">
              <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-300">Aucun match enregistré pour le moment</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Jouez en ligne, contre l'IA ou en Solo pour enregistrer vos statistiques !
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {history.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-2.5 bg-slate-900 border border-slate-800/80 rounded-xl hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {m.isWin ? (
                      <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-rose-950 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0">
                        <XCircle className="w-4 h-4" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="text-xs font-black text-white flex items-center gap-1.5 truncate">
                        <span>vs {m.opponentName}</span>
                        <span className="text-[9px] bg-slate-800 text-slate-400 px-1 rounded">{m.gameType}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(m.date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-black font-mono">
                      <span className={m.isWin ? 'text-emerald-400' : 'text-slate-400'}>{m.legsWon}</span>
                      <span className="text-slate-600 mx-1">-</span>
                      <span className={!m.isWin ? 'text-rose-400' : 'text-slate-400'}>{m.legsLost}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Moy: <b className="text-white font-mono">{m.matchAverage}</b>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

