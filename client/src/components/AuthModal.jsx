import React, { useState } from 'react';
import { User, Mail, Lock, LogIn, UserPlus, X, ShieldCheck } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, backendUrl }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const body = isRegister
        ? { username, email, password }
        : { identifier: email || username, password };

      const res = await fetch(`${backendUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur d\'authentification');
      }

      onAuthSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminQuickFill = () => {
    setIsRegister(false);
    setEmail('admin@dartsma.com');
    setPassword('admin123');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <h2 className="text-xl font-black text-white">
            {isRegister ? 'Créer un Compte' : 'Connexion Joueur'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isRegister
              ? 'Choisissez votre pseudo unique et commencez à jouer'
              : 'Accédez à votre profil et vos statistiques'}
          </p>
        </div>

        {error && (
          <div className="bg-rose-950/80 border border-rose-500/60 text-rose-300 text-xs p-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Pseudo de joueur</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Ex: RobinDesBois"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              {isRegister ? 'Adresse Email' : 'Email ou Pseudo'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={isRegister ? 'email' : 'text'}
                required
                placeholder={isRegister ? 'nom@exemple.com' : 'Votre email ou pseudo'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Mot de passe</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : isRegister ? (
              <>
                <UserPlus className="w-4 h-4" /> S'inscrire
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Se Connecter
              </>
            )}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            className="text-emerald-400 hover:underline font-bold"
          >
            {isRegister ? 'Déjà inscrit ? Se connecter' : 'Pas encore de compte ? S\'inscrire'}
          </button>

          {!isRegister && (
            <button
              type="button"
              onClick={handleAdminQuickFill}
              className="text-slate-400 hover:text-amber-400 flex items-center gap-1 font-semibold"
              title="Remplir les identifiants administrateur"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              Admin
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

