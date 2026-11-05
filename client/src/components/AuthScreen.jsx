import React, { useState, useEffect } from 'react';
import { Target, User, Mail, Lock, LogIn, UserPlus, AlertCircle, CheckCircle2, RefreshCw, ArrowLeft, ExternalLink, Send } from 'lucide-react';

export default function AuthScreen({ onAuthSuccess, backendUrl, socket }) {
  const [isRegister, setIsRegister] = useState(true); // Default to registration
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // État de validation d'email en cours
  const [pendingVerification, setPendingVerification] = useState(null);
  const [isVerifiedSuccess, setIsVerifiedSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');

  // Surveillance en temps réel de la validation (WebSocket + Polling toutes les 2s)
  useEffect(() => {
    if (!pendingVerification || isVerifiedSuccess) return;
    let isCancelled = false;

    const checkVerification = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/auth/check-verification?userId=${pendingVerification.userId}`);
        const data = await res.json();
        if (data.isVerified && data.user && !isCancelled) {
          setIsVerifiedSuccess(true);
          setTimeout(() => {
            onAuthSuccess(data.user);
          }, 900);
        }
      } catch (e) {
        // Ignorer les erreurs réseau temporaires
      }
    };

    // Vérification immédiate
    checkVerification();

    // Polling régulier
    const interval = setInterval(checkVerification, 2000);

    // Écouteur WebSocket en temps réel
    if (socket) {
      const handleVerified = (verifiedUser) => {
        if ((verifiedUser.id === pendingVerification.userId || verifiedUser.email === pendingVerification.email) && !isCancelled) {
          setIsVerifiedSuccess(true);
          setTimeout(() => {
            onAuthSuccess(verifiedUser);
          }, 900);
        }
      };

      socket.on(`auth:verified_${pendingVerification.userId}`, handleVerified);
      socket.on('auth:verified', handleVerified);

      return () => {
        isCancelled = true;
        clearInterval(interval);
        socket.off(`auth:verified_${pendingVerification.userId}`, handleVerified);
        socket.off('auth:verified', handleVerified);
      };
    }

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [pendingVerification, isVerifiedSuccess, socket, backendUrl, onAuthSuccess]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const body = isRegister
        ? { username: username.trim(), email: email.trim(), password, originUrl }
        : { identifier: (email || username).trim(), password };

      const res = await fetch(`${backendUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'EMAIL_NOT_VERIFIED') {
          setPendingVerification({
            userId: data.userId,
            email: data.email || email,
            username: username || '',
            verificationLink: null,
            simulated: false
          });
          return;
        }
        throw new Error(data.error || 'Erreur lors de l\'authentification');
      }

      if (isRegister && data.requiresVerification) {
        setPendingVerification({
          userId: data.user.id,
          email: data.user.email,
          username: data.user.username,
          verificationLink: data.verificationLink,
          simulated: !!data.simulated
        });
        return;
      }

      onAuthSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!pendingVerification) return;
    setResendLoading(true);
    setResendSuccess('');
    setError('');

    try {
      const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch(`${backendUrl}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: pendingVerification.userId, originUrl })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors du renvoi.');
      }
      if (data.verificationLink) {
        setPendingVerification(prev => ({
          ...prev,
          verificationLink: data.verificationLink,
          simulated: !!data.simulated
        }));
      }
      setResendSuccess('Un nouvel email de validation vient de vous être envoyé !');
      setTimeout(() => setResendSuccess(''), 6000);
    } catch (err) {
      setError(err.message);
    } finally {
      setResendLoading(false);
    }
  };

  // ÉCRAN 1 : Attente de validation de l'adresse email
  if (pendingVerification) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] w-full bg-slate-950 text-slate-100 p-4 select-none">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative text-center">
          
          {isVerifiedSuccess ? (
            /* Succès et transition automatique */
            <div className="py-8 space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-emerald-500/20 border-2 border-emerald-500 rounded-3xl flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/30">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
              <h2 className="text-2xl font-black text-white">Email Confirmé !</h2>
              <p className="text-sm text-emerald-400 font-bold">
                Redirection automatique vers l'application...
              </p>
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mt-2" />
            </div>
          ) : (
            /* En attente du clic sur le lien */
            <>
              {/* En-tête avec enveloppe animée */}
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/20 relative">
                  <Mail className="w-8 h-8" />
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                  </span>
                </div>
              </div>

              <h2 className="text-2xl font-black tracking-tight text-white mb-2">
                Validez votre adresse email
              </h2>
              <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                Un message avec un lien de validation sécurisé a été envoyé à :
              </p>

              {/* Adresse email mise en avant */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 mb-5 flex items-center justify-center gap-2">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold text-sm text-slate-200 break-all">
                  {pendingVerification.email}
                </span>
              </div>

              {/* Statut d'attente automatique */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 mb-5 text-left flex items-start gap-3">
                <RefreshCw className="w-5 h-5 text-emerald-400 shrink-0 animate-spin mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-emerald-300">En attente de validation...</p>
                  <p className="text-slate-400 leading-relaxed">
                    Cliquez sur le lien dans l'email. Dès que c'est fait, <strong>ce formulaire se validera tout seul</strong> et vous serez automatiquement redirigé dans le jeu.
                  </p>
                </div>
              </div>

              {resendSuccess && (
                <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs p-3 rounded-xl mb-4 flex items-center gap-2 text-left">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{resendSuccess}</span>
                </div>
              )}

              {error && (
                <div className="bg-rose-950/80 border border-rose-500/60 text-rose-300 text-xs p-3 rounded-xl mb-4 flex items-start gap-2 text-left">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Lien de test direct en mode local / simulation pour faciliter le test */}
              {pendingVerification.verificationLink && (
                <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-3 mb-5 text-left">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-1.5">
                    <span>⚡ Mode test / simulation actif</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Le serveur SMTP externe n'est pas requis pour tester. Cliquez directement ci-dessous pour valider immédiatement :
                  </p>
                  <a
                    href={pendingVerification.verificationLink}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ouvrir le lien de validation (Test)
                  </a>
                </div>
              )}

              {/* Bouton de renvoi d'email */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={resendLoading}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {resendLoading ? (
                    <span className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Renvoyer l'email de confirmation
                    </>
                  )}
                </button>

                {/* Bouton retour en cas d'erreur de frappe dans l'email */}
                <button
                  type="button"
                  onClick={() => {
                    setPendingVerification(null);
                    setError('');
                    setResendSuccess('');
                  }}
                  className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-white transition flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Corriger mon email ou changer de compte
                </button>
              </div>
            </>
          )}

          {/* Footer sécurisé */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-500">
            Plateforme sécurisée DartsMa Pro • Lien valable 24h
          </div>
        </div>
      </div>
    );
  }

  // ÉCRAN 2 : Formulaire standard Inscription / Connexion
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
