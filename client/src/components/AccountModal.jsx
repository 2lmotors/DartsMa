import React, { useState } from 'react';
import { User, Mail, Lock, Key, Shield, CheckCircle2, AlertCircle, X, Calendar, Award } from 'lucide-react';

export default function AccountModal({ isOpen, onClose, currentUser, backendUrl, onUserUpdated }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen || !currentUser) return null;

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!oldPassword) {
      setError('Veuillez entrer votre ancien mot de passe.');
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setError('Le nouveau mot de passe doit comporter au moins 4 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Le nouveau mot de passe et sa confirmation ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          oldPassword,
          newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors du changement de mot de passe.');
      }

      setSuccess('Votre mot de passe a été modifié avec succès !');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (onUserUpdated && data.user) {
        onUserUpdated(data.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 z-50 animate-in fade-in select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow">
              <User className="w-5 h-5 font-black" />
            </div>
            <div>
              <h3 className="font-black text-white text-base leading-tight">Mon Compte Personnel</h3>
              <p className="text-[11px] text-slate-400">Informations & Sécurité</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profil info */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 mb-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Pseudo :</span>
            <span className="text-xs font-bold text-white flex items-center gap-1">
              {currentUser.username}
              {currentUser.role === 'admin' && (
                <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 rounded font-black">
                  ADMIN
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Adresse Email :</span>
            <span className="text-xs font-bold text-emerald-400 truncate max-w-[200px]">
              {currentUser.email}
            </span>
          </div>
          {currentUser.createdAt && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Membre depuis :</span>
              <span className="text-xs text-slate-300 font-medium">
                {new Date(currentUser.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
          )}
        </div>

        {/* Rubrique : Modification de mot de passe */}
        <div className="border-t border-slate-800 pt-4">
          <div className="flex items-center gap-1.5 mb-3 text-slate-200">
            <Lock className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-black uppercase tracking-wider">
              Modification du mot de passe
            </h4>
          </div>

          {success && (
            <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs p-3 rounded-xl mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="bg-rose-950/80 border border-rose-500/60 text-rose-300 text-xs p-3 rounded-xl mb-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Ancien mot de passe
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="Votre mot de passe actuel"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Nouveau mot de passe
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
                Confirmer le nouveau mot de passe
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="Réécrivez le nouveau mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition flex items-center justify-center gap-1.5 shadow active:scale-95 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Key className="w-3.5 h-3.5" />
                  <span>Enregistrer le nouveau mot de passe</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

