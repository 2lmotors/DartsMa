import React, { useState, useEffect } from 'react';
import { 
  Shield, ShieldCheck, Crown, Users, Ban, Trash2, CheckCircle, RefreshCw, X, Award, 
  Activity, Home, ArrowLeft, BarChart3, Target, Flame, Trophy, 
  Calendar, CheckCircle2, XCircle, RotateCcw, UserPlus, Mail, Lock
} from 'lucide-react';

export default function AdminPanel({ isOpen, onClose, currentAdmin, backendUrl }) {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ activeGamesCount: 0, onlineSocketsCount: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [justRefreshed, setJustRefreshed] = useState(false);
  const [inspectingUser, setInspectingUser] = useState(null);

  // Modal d'ajout d'utilisateur par l'administrateur
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  const getAdminId = () => {
    if (currentAdmin?.id) return currentAdmin.id;
    try {
      const stored = JSON.parse(localStorage.getItem('dartsma_user') || '{}');
      return stored.id || '';
    } catch (e) {
      return '';
    }
  };

  const getApiUrl = (endpoint) => {
    const base = backendUrl ? backendUrl.replace(/\/$/, '') : '';
    return `${base}${endpoint}`;
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const adminId = getAdminId();
      const res = await fetch(getApiUrl('/api/admin/users'), {
        headers: { 'x-admin-id': adminId }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors du chargement');
      setUsers(data.users || []);
      setStats({
        activeGamesCount: data.activeGamesCount || 0,
        onlineSocketsCount: data.onlineSocketsCount || 0
      });
      setJustRefreshed(true);
      setTimeout(() => setJustRefreshed(false), 2000);
    } catch (err) {
      console.error('Fetch users error:', err);
      setError(err.message || 'Impossible de contacter le serveur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const handleToggleBan = async (userId) => {
    try {
      const adminId = getAdminId();
      const res = await fetch(getApiUrl('/api/admin/toggle-ban'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-id': adminId
        },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchUsers();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Supprimer définitivement l'utilisateur ${username} ?`)) return;
    try {
      const adminId = getAdminId();
      const res = await fetch(getApiUrl(`/api/admin/user/${userId}`), {
        method: 'DELETE',
        headers: { 'x-admin-id': adminId }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchUsers();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleResetStats = async (userId, username) => {
    if (!window.confirm(`Réinitialiser toutes les statistiques de ${username} à zéro ?\n(Victoires, défaites, moyennes et historique seront remis à zéro)`)) return;
    try {
      const adminId = getAdminId();
      const res = await fetch(getApiUrl(`/api/admin/user/${userId}/reset-stats`), {
        method: 'POST',
        headers: { 'x-admin-id': adminId }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (inspectingUser && inspectingUser.id === userId) {
        setInspectingUser(data.user);
      }
      fetchUsers();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleToggleRole = async (userId, username, currentRole) => {
    const isPromoting = currentRole !== 'admin';
    const confirmMsg = isPromoting 
      ? `Nommer « ${username} » comme Administrateur ?\n\nCet utilisateur aura accès au panneau de gestion administrateur (comptes, statistiques et sanctions).`
      : `Rétrograder « ${username} » au rang de Joueur standard ?\n\nIl n'aura plus accès aux outils administrateur.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const adminId = getAdminId();
      const res = await fetch(getApiUrl(`/api/admin/user/${userId}/toggle-role`), {
        method: 'POST',
        headers: { 'x-admin-id': adminId }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (inspectingUser && inspectingUser.id === userId) {
        setInspectingUser(data.user);
      }
      fetchUsers();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');
    setAddLoading(true);

    try {
      const adminId = getAdminId();
      const res = await fetch(getApiUrl('/api/admin/users/create'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-id': adminId
        },
        body: JSON.stringify({
          email: newEmail.trim(),
          password: newPassword,
          username: newUsername.trim() || undefined,
          role: newRole
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la création');

      setAddSuccess(`Joueur ${data.user.username} (${data.user.email}) ajouté avec succès !`);
      setNewEmail('');
      setNewPassword('');
      setNewUsername('');
      setNewRole('user');
      fetchUsers();
      setTimeout(() => {
        setShowAddUserModal(false);
        setAddSuccess('');
      }, 1400);
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 z-50 animate-in fade-in overflow-hidden"
      style={{
        paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0.5rem))',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0.5rem))',
        paddingLeft: 'max(0.5rem, env(safe-area-inset-left, 0.5rem))',
        paddingRight: 'max(0.5rem, env(safe-area-inset-right, 0.5rem))'
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl h-full max-h-[96dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-800 bg-slate-900/95 shrink-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base md:text-lg font-black text-white flex items-center gap-1.5 sm:gap-2 truncate">
                <span className="truncate">Panneau Admin</span>
                <span className="text-[9px] sm:text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-bold shrink-0">SuperAdmin</span>
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400 hidden xs:block truncate">Gestion des comptes, joueurs et matchs</p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={() => { setShowAddUserModal(true); setAddError(''); setAddSuccess(''); }}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition shadow active:scale-95 shrink-0 cursor-pointer"
              title="Ajouter manuellement un utilisateur avec email et mot de passe"
            >
              <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Ajouter un joueur</span>
            </button>
            <button
              onClick={onClose}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs flex items-center gap-1.5 transition shadow active:scale-95 shrink-0 cursor-pointer"
              title="Retour à la page d'accueil"
            >
              <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
              <span className="hidden sm:inline">Accueil</span>
            </button>
            <button
              type="button"
              onClick={fetchUsers}
              disabled={loading}
              className={`px-2.5 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow cursor-pointer shrink-0 ${
                justRefreshed
                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
              title="Rafraîchir les données et statistiques"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{loading ? 'Chargement...' : justRefreshed ? 'Actualisé !' : 'Actualiser'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-3 p-2 sm:p-3 bg-slate-950/50 border-b border-slate-800 shrink-0">
          <div className="p-2 sm:p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center gap-1.5 sm:gap-2">
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[9px] sm:text-[10px] text-slate-400 truncate uppercase font-semibold">Inscrits</div>
              <div className="text-sm sm:text-base font-black text-white">{users.length}</div>
            </div>
          </div>
          <div className="p-2 sm:p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center gap-1.5 sm:gap-2">
            <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[9px] sm:text-[10px] text-slate-400 truncate uppercase font-semibold">En ligne</div>
              <div className="text-sm sm:text-base font-black text-white">{stats.onlineSocketsCount}</div>
            </div>
          </div>
          <div className="p-2 sm:p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center gap-1.5 sm:gap-2">
            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[9px] sm:text-[10px] text-slate-400 truncate uppercase font-semibold">Matchs</div>
              <div className="text-sm sm:text-base font-black text-white">{stats.activeGamesCount}</div>
            </div>
          </div>
        </div>

        {/* User Table */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-4 min-h-0">
          {error && (
            <div className="bg-rose-950/80 border border-rose-500/60 text-rose-300 text-xs p-2.5 sm:p-3 rounded-xl mb-3 sm:mb-4">
              {error}
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/40">
            <table className="w-full text-left text-xs text-slate-300 min-w-[500px] sm:min-w-full">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[9px] sm:text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-2.5 sm:p-3">Joueur</th>
                  <th className="p-2.5 sm:p-3 hidden md:table-cell">Email</th>
                  <th className="p-2.5 sm:p-3 hidden sm:table-cell">Rôle</th>
                  <th className="p-2.5 sm:p-3">Statut</th>
                  <th className="p-2.5 sm:p-3">Victoires</th>
                  <th className="p-2.5 sm:p-3">Statistiques</th>
                  <th className="p-2.5 sm:p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-850/50 transition">
                    <td className="p-2.5 sm:p-3 font-bold text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black shrink-0">
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="truncate">{u.username}</span>
                            {u.role === 'admin' && (
                              <span className="sm:hidden text-[8px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 rounded font-bold">
                                ADMIN
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-normal truncate max-w-[140px] md:hidden">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-2.5 sm:p-3 text-slate-400 hidden md:table-cell truncate max-w-[180px]">
                      {u.email}
                    </td>
                    <td className="p-2.5 sm:p-3 hidden sm:table-cell">
                      {u.id === getAdminId() ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          <Crown className="w-3 h-3 text-amber-400" />
                          <span>VOUS (ADMIN)</span>
                        </span>
                      ) : u.role === 'admin' ? (
                        <button
                          onClick={() => handleToggleRole(u.id, u.username, u.role)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-500/40 transition active:scale-95 cursor-pointer"
                          title="Cliquez pour rétrograder au rang de Joueur standard"
                        >
                          <Crown className="w-3 h-3 text-amber-400" />
                          <span>ADMIN</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleRole(u.id, u.username, u.role)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-amber-500/50 transition active:scale-95 cursor-pointer group"
                          title="Nommer cet utilisateur Administrateur"
                        >
                          <span>JOUEUR</span>
                          <span className="text-[9px] text-amber-400 opacity-60 group-hover:opacity-100 font-bold ml-0.5">+ Admin</span>
                        </button>
                      )}
                    </td>
                    <td className="p-2.5 sm:p-3">
                      <span className={`inline-flex items-center gap-1.5 font-bold text-[11px] ${u.isBanned ? 'text-rose-400' : 'text-emerald-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.isBanned ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                        <span>{u.isBanned ? 'Banni' : 'Actif'}</span>
                      </span>
                    </td>
                    <td className="p-2.5 sm:p-3 font-mono">
                      <div className="flex items-baseline gap-1 font-bold">
                        <span className="text-emerald-400">{u.stats?.matchesWon || 0}</span>
                        <span className="text-slate-500 text-[10px]">V</span>
                        <span className="text-slate-600 text-[10px]">/</span>
                        <span className="text-rose-400 text-xs">{u.stats?.matchesLost || 0}</span>
                        <span className="text-slate-500 text-[10px]">D</span>
                      </div>
                    </td>
                    <td className="p-2.5 sm:p-3">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="text-[11px] leading-tight">
                          <div className="text-slate-300">
                            Moy. tot: <b className="text-emerald-400 font-mono">{u.stats?.averagePerMatch !== undefined ? Number(Math.min(60, u.stats.averagePerMatch)).toFixed(2) : '0.00'}</b>
                          </div>
                          <div className="text-slate-400 text-[10px]">
                            / flèche: <b className="text-teal-400 font-mono">{u.stats?.averagePerDart !== undefined ? Number(Math.min(60, u.stats.averagePerDart)).toFixed(2) : '0.00'}</b>
                          </div>
                        </div>
                        <button
                          onClick={() => setInspectingUser(u)}
                          className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/40 text-[10px] sm:text-[11px] font-black flex items-center gap-1 transition active:scale-95 shadow shrink-0 cursor-pointer"
                          title={`Voir toutes les statistiques détaillées de ${u.username}`}
                        >
                          <BarChart3 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
                          <span>Stats</span>
                        </button>
                      </div>
                    </td>
                    <td className="p-2.5 sm:p-3 text-right">
                      <div className="flex items-center justify-end gap-1 sm:gap-1.5">
                        {/* Bouton Nommer ou Rétrograder Admin */}
                        {u.id !== getAdminId() && (
                          <button
                            onClick={() => handleToggleRole(u.id, u.username, u.role)}
                            className={`p-1.5 rounded-lg border transition cursor-pointer active:scale-95 ${
                              u.role === 'admin'
                                ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 hover:bg-amber-900'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-amber-300 hover:border-amber-500/40 hover:bg-slate-700'
                            }`}
                            title={u.role === 'admin' ? 'Rétrograder en Joueur standard' : 'Nommer Administrateur'}
                          >
                            <Crown className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleResetStats(u.id, u.username)}
                          className="p-1.5 rounded-lg bg-sky-950/60 border border-sky-500/40 text-sky-300 hover:bg-sky-900 transition cursor-pointer active:scale-95"
                          title="Réinitialiser les statistiques à zéro"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        {u.role !== 'admin' && (
                          <>
                            <button
                              onClick={() => handleToggleBan(u.id)}
                              className={`p-1.5 rounded-lg border transition cursor-pointer active:scale-95 ${
                                u.isBanned
                                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900'
                                  : 'bg-amber-950/60 border-amber-500/40 text-amber-300 hover:bg-amber-900'
                              }`}
                              title={u.isBanned ? 'Débannir' : 'Bannir'}
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              className="p-1.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 hover:bg-rose-900 transition cursor-pointer active:scale-95"
                              title="Supprimer définitivement"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Bar with Return to Home Button */}
        <div className="p-2.5 sm:p-3.5 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between shrink-0 gap-2">
          <span className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">
            Total : <strong className="text-white">{users.length}</strong> joueur{users.length > 1 ? 's' : ''}
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 sm:gap-2 transition active:scale-95 border border-slate-700 shadow shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
            <span className="hidden sm:inline">Retour à la page d'accueil</span>
            <span className="sm:hidden">Retour accueil</span>
          </button>
        </div>
      </div>

      {/* Detailed Player Statistics Inspector Modal */}
      {inspectingUser && (
        <div 
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-60 animate-in fade-in overflow-hidden"
          style={{
            paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0.5rem))',
            paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0.5rem))',
            paddingLeft: 'max(0.5rem, env(safe-area-inset-left, 0.5rem))',
            paddingRight: 'max(0.5rem, env(safe-area-inset-right, 0.5rem))'
          }}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl h-full max-h-[96dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-800 bg-slate-900/90 shrink-0 gap-2">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <button
                  onClick={() => setInspectingUser(null)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-95 shrink-0 cursor-pointer"
                  title="Retour à la liste des joueurs"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                </button>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5 sm:gap-2 truncate">
                    <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
                    <span className="truncate">{inspectingUser.username}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                      inspectingUser.role === 'admin' 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {inspectingUser.role.toUpperCase()}
                    </span>
                    {inspectingUser.id !== getAdminId() && (
                      <button
                        onClick={() => handleToggleRole(inspectingUser.id, inspectingUser.username, inspectingUser.role)}
                        className={`text-[9px] px-2 py-0.5 rounded font-black flex items-center gap-1 border transition cursor-pointer active:scale-95 ${
                          inspectingUser.role === 'admin'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-amber-500/40 hover:text-amber-300'
                        }`}
                        title={inspectingUser.role === 'admin' ? 'Rétrograder en Joueur standard' : 'Nommer Administrateur'}
                      >
                        <Crown className="w-2.5 h-2.5 text-amber-400" />
                        <span>{inspectingUser.role === 'admin' ? 'Rétrograder' : '+ Nommer Admin'}</span>
                      </button>
                    )}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">{inspectingUser.email}</p>
                </div>
              </div>

              <button
                onClick={() => setInspectingUser(null)}
                className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer shrink-0"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 min-h-0">
              {/* Highlights 4-Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                {/* Moyenne Totale */}
                <div className="bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/40 rounded-xl p-2.5 sm:p-3 flex flex-col justify-between shadow">
                  <div className="flex items-center justify-between text-emerald-400 mb-1">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase">Moy. Totale</span>
                    <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-white font-mono">
                    {Number(Math.min(60, inspectingUser.stats?.averagePerMatch || 0)).toFixed(2)}
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-slate-400 mt-1">Score / flèches</span>
                </div>

                {/* Moyenne par flèche */}
                <div className="bg-gradient-to-br from-teal-950/40 to-slate-900 border border-teal-500/40 rounded-xl p-2.5 sm:p-3 flex flex-col justify-between shadow">
                  <div className="flex items-center justify-between text-teal-400 mb-1">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase">Moy. / flèche</span>
                    <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-white font-mono">
                    {Number(Math.min(60, inspectingUser.stats?.averagePerDart || 0)).toFixed(2)}
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-slate-400 mt-1">Plafond 60 max</span>
                </div>

                {/* Matchs */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 sm:p-3 flex flex-col justify-between shadow">
                  <div className="flex items-center justify-between text-amber-400 mb-1">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase">Matchs</span>
                    <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>
                  <div className="flex items-baseline gap-1 font-mono">
                    <span className="text-xl sm:text-2xl font-black text-emerald-400">{inspectingUser.stats?.matchesWon || 0}</span>
                    <span className="text-xs text-slate-500 font-bold">V</span>
                    <span className="text-slate-600">/</span>
                    <span className="text-lg sm:text-xl font-bold text-rose-400">{inspectingUser.stats?.matchesLost || 0}</span>
                    <span className="text-xs text-slate-500 font-bold">D</span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-slate-400 mt-1">{inspectingUser.stats?.matchesPlayed || 0} match(s)</span>
                </div>

                {/* Legs */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 sm:p-3 flex flex-col justify-between shadow">
                  <div className="flex items-center justify-between text-blue-400 mb-1">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase">Manches</span>
                    <Award className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>
                  <div className="flex items-baseline gap-1 font-mono">
                    <span className="text-xl sm:text-2xl font-black text-white">{inspectingUser.stats?.legsWon || 0}</span>
                    <span className="text-slate-600">/</span>
                    <span className="text-lg sm:text-xl font-bold text-slate-400">{inspectingUser.stats?.legsLost || 0}</span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-slate-400 mt-1">{inspectingUser.stats?.legsPlayed || 0} leg(s)</span>
                </div>
              </div>

              {/* Volume stats row */}
              <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2 sm:p-2.5 rounded-xl border border-slate-800 text-[11px] sm:text-xs">
                <div className="flex items-center justify-between px-1.5 sm:px-2">
                  <span className="text-slate-400">Total flèches :</span>
                  <b className="text-white font-mono">{inspectingUser.stats?.totalDartsThrown || 0}</b>
                </div>
                <div className="flex items-center justify-between px-1.5 sm:px-2 border-l border-slate-800">
                  <span className="text-slate-400">Total points :</span>
                  <b className="text-emerald-400 font-mono">{inspectingUser.stats?.totalPointsScored || 0}</b>
                </div>
              </div>

              {/* Match History */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] sm:text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    Historique des matchs ({inspectingUser.stats?.history?.length || 0})
                  </h4>
                </div>

                {(!inspectingUser.stats?.history || inspectingUser.stats.history.length === 0) ? (
                  <div className="p-4 sm:p-5 bg-slate-950/40 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-400">
                    Ce joueur n'a encore enregistré aucun match.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 sm:max-h-56 overflow-y-auto pr-0.5">
                    {inspectingUser.stats.history.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-2 bg-slate-950/60 border border-slate-800 rounded-xl hover:border-slate-700 transition"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {m.isWin ? (
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
                              <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-rose-950 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0">
                              <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white flex items-center gap-1 truncate">
                              <span className="truncate">vs {m.opponentName}</span>
                              <span className="text-[9px] bg-slate-800 text-slate-400 px-1 rounded shrink-0">{m.gameType || '501'}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
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
                          <div className="text-xs font-mono font-bold">
                            <span className={m.isWin ? 'text-emerald-400' : 'text-slate-400'}>{m.legsWon}</span>
                            <span className="text-slate-600 mx-1">-</span>
                            <span className={!m.isWin ? 'text-rose-400' : 'text-slate-400'}>{m.legsLost}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Moy: <b className="text-white font-mono">{Number(Math.min(60, m.matchAverage || 0)).toFixed(2)}</b>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-2.5 sm:p-3 border-t border-slate-800 bg-slate-900 flex items-center justify-between shrink-0 gap-2">
              <button
                onClick={() => handleResetStats(inspectingUser.id, inspectingUser.username)}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 border border-rose-500/40 cursor-pointer"
                title="Remettre à zéro toutes les statistiques de ce joueur"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                <span>Reset stats joueur</span>
              </button>
              <button
                onClick={() => setInspectingUser(null)}
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 sm:gap-2 transition active:scale-95 border border-slate-700 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                <span>Retour à la liste</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajout Utilisateur par l'Admin */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 z-50 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-black text-white text-base">Ajouter un Utilisateur</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addSuccess && (
              <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs p-3 rounded-xl mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{addSuccess}</span>
              </div>
            )}

            {addError && (
              <div className="bg-rose-950/80 border border-rose-500/60 text-rose-300 text-xs p-3 rounded-xl mb-4">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddUser} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Adresse Email <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="joueur@exemple.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Mot de passe <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="Au moins 4 caractères"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Pseudo <span className="text-slate-500 font-normal">(facultatif, extrait de l'email si vide)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: RobinDesBois"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  maxLength={18}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Rôle initial</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRole('user')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      newRole === 'user'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Joueur Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRole('admin')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      newRole === 'admin'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Administrateur
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition flex items-center gap-1.5 shadow active:scale-95 disabled:opacity-50"
                >
                  {addLoading ? (
                    <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Créer l'utilisateur</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

