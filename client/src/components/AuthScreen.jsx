import React, { useState } from 'react';
import { Target, User, Mail, Lock, LogIn, UserPlus, AlertCircle } from 'lucide-react';

export default function AuthScreen({ onAuthSuccess, backendUrl }) {
  const [isRegister, setIsRegister] = useState(true); // Default to registration
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const body = isRegister
        ? { username: username.trim(), email: email.trim(), password }
        : { identifier: (email || username).trim(), password };

      const res = await fetch(`${backendUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l\'authentification');
      }

      onAuthSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] w-full bg-slate-950 text-slate-100 p-4 select-none">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/20">
            <Target className="w-8 h-8 text-slate-950 font-black" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
            DARTSMA <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">PRO</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Inscription requise pour accéder à la plateforme
          </p>
        </div>

        {/* Inscription / Connexion Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl border border-slate-800 mb-5">
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(''); }}
            className={`py-2 rounded-lg text-xs font-black transition-all ${
              isRegister
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            S'inscrire
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); }}
            className={`py-2 rounded-lg text-xs font-black transition-all ${
              !isRegister
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Se Connecter
          </button>
        </div>

        {error && (
          <div className="bg-rose-950/80 border border-rose-500/60 text-rose-300 text-xs p-3 rounded-xl mb-4 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Choisissez votre Pseudo
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Ex: RobinDesBois"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={18}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white font-medium focus:border-emerald-500 focus:outline-none transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              {isRegister ? 'Votre Adresse Email' : 'Email ou Pseudo'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={isRegister ? 'email' : 'text'}
                required
                placeholder={isRegister ? 'nom@exemple.com' : 'Votre email ou pseudo'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white font-medium focus:border-emerald-500 focus:outline-none transition"
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
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white font-medium focus:border-emerald-500 focus:outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mt-2 active:scale-95"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : isRegister ? (
              <>
                <UserPlus className="w-4 h-4" /> Créer mon Compte
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Ouvrir ma Session
              </>
            )}
          </button>
        </form>

        {/* Security Footer */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-center text-xs text-slate-500">
          <span>Plateforme sécurisée DartsMa Pro</span>
        </div>
      </div>
    </div>
  );
}

