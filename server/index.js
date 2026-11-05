const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const os = require('os');
const db = require('./db');
const mailer = require('./mailer');
const tournamentManager = require('./tournament');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static client if built
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('sw.js')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Port
const PORT = process.env.PORT || 4000;

// State management
const sockets = new Map(); // socketId -> userSession { id, username, email, role, socketId, status: 'idle' | 'in_game' }
const challenges = new Map(); // challengeId -> { id, from, to, gameType, bestOf }
const games = new Map(); // roomId -> gameState

function broadcastLobby() {
  const userList = Array.from(sockets.values()).map(u => ({
    id: u.id,
    socketId: u.socketId,
    username: u.username,
    role: u.role,
    status: u.status
  }));
  io.emit('lobby:users', userList);
}

// REST Auth Endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, originUrl } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Tous les champs sont requis.' });
    }
    const { user, verificationToken } = db.register(username, email, password);

    // Déterminer l'URL de base pour le lien de validation
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const base = originUrl || process.env.PUBLIC_URL || `${proto}://${host}`;
    const verificationLink = `${base.replace(/\/$/, '')}/api/auth/verify-email?token=${verificationToken}`;

    // Envoi de l'email de validation
    const mailResult = await mailer.sendVerificationEmail({
      email: user.email,
      username: user.username,
      verificationLink
    });

    res.json({
      success: true,
      requiresVerification: true,
      user,
      verificationLink: mailResult.simulated ? verificationLink : undefined,
      simulated: !!mailResult.simulated
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/auth/verify-email', (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).send('Jeton de validation manquant.');
    }
    const verifiedUser = db.verifyEmailToken(token);

    // Diffusion en temps réel par WebSocket pour débloquer automatiquement le formulaire d'inscription en attente
    io.emit('auth:verified_' + verifiedUser.id, verifiedUser);
    io.emit('auth:verified', verifiedUser);

    if (req.accepts('json') && !req.accepts('html')) {
      return res.json({ success: true, user: verifiedUser });
    }

    // Redirection automatique dans l'application avec profil utilisateur connecté
    const redirectUrl = `/?verified=1&userId=${verifiedUser.id}&username=${encodeURIComponent(verifiedUser.username)}`;
    res.send(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="refresh" content="2;url=${redirectUrl}">
        <title>Email Validé - DartsMa Pro</title>
        <style>
          body { background: #020617; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 16px; box-sizing: border-box; text-align: center; }
          .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 24px; padding: 36px 28px; max-width: 420px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); }
          .badge { width: 64px; height: 64px; background: #10b981; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; margin-bottom: 16px; }
          h2 { color: #ffffff; font-size: 22px; margin: 0 0 10px; font-weight: 800; }
          p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px; }
          .btn { display: inline-block; background: #10b981; color: #020617; font-weight: 900; font-size: 15px; padding: 14px 28px; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 20px rgba(16, 185, 129, 0.35); }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">🎯</div>
          <h2>Adresse Email Validée !</h2>
          <p>Félicitations <strong>${verifiedUser.username}</strong>, votre compte est désormais actif.<br>Vous allez être redirigé automatiquement dans l'application...</p>
          <a href="${redirectUrl}" class="btn">Accéder à DartsMa Live</a>
        </div>
        <script>
          setTimeout(function() { window.location.href = "${redirectUrl}"; }, 1200);
        </script>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(400).send(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Erreur de Validation - DartsMa Pro</title>
        <style>
          body { background: #020617; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 16px; box-sizing: border-box; text-align: center; }
          .card { background: #0f172a; border: 1px solid #e11d48; border-radius: 24px; padding: 36px 28px; max-width: 420px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); }
          .badge { width: 64px; height: 64px; background: #e11d48; border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; margin-bottom: 16px; }
          h2 { color: #ffffff; font-size: 22px; margin: 0 0 10px; font-weight: 800; }
          p { color: #fda4af; font-size: 14px; line-height: 1.6; margin: 0 0 24px; }
          .btn { display: inline-block; background: #334155; color: #f8fafc; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 12px; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">⚠️</div>
          <h2>Lien invalide ou expiré</h2>
          <p>${err.message}</p>
          <a href="/" class="btn">Retour à la page d'accueil</a>
        </div>
      </body>
      </html>
    `);
  }
});

app.get('/api/auth/check-verification', (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId requis' });
  }
  const result = db.checkUserVerified(userId);
  res.json(result);
});

app.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const { identifier, originUrl } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Identifiant ou email requis.' });
    }
    const result = db.resendVerification(identifier);
    if (result.alreadyVerified) {
      return res.json({ alreadyVerified: true, message: 'Ce compte est déjà validé.' });
    }

    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const base = originUrl || process.env.PUBLIC_URL || `${proto}://${host}`;
    const verificationLink = `${base.replace(/\/$/, '')}/api/auth/verify-email?token=${result.verificationToken}`;

    const mailResult = await mailer.sendVerificationEmail({
      email: result.user.email,
      username: result.user.username,
      verificationLink
    });

    res.json({
      success: true,
      message: 'Un nouvel email de validation a été envoyé.',
      verificationLink: mailResult.simulated ? verificationLink : undefined,
      simulated: !!mailResult.simulated
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/auth/user/:id', (req, res) => {
  const user = db.getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json({ success: true, user });
});

app.post('/api/auth/change-password', (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;
    if (!userId || !oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Tous les champs sont requis.' });
    }
    const updated = db.changePassword(userId, oldPassword, newPassword);
    res.json({ success: true, user: updated, message: 'Mot de passe modifié avec succès !' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email, originUrl } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Adresse email requise.' });
    }
    const { user, resetToken } = db.createPasswordResetToken(email);

    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const base = originUrl || process.env.PUBLIC_URL || `${proto}://${host}`;
    const resetLink = `${base.replace(/\/$/, '')}/?resetToken=${resetToken}`;

    const mailResult = await mailer.sendPasswordResetEmail({
      email: user.email,
      username: user.username,
      resetLink
    });

    res.json({
      success: true,
      message: 'Un email contenant le lien de réinitialisation vous a été envoyé.',
      resetLink: mailResult.simulated ? resetLink : undefined,
      simulated: !!mailResult.simulated
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/reset-password', (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Jeton et nouveau mot de passe requis.' });
    }
    const user = db.resetPasswordWithToken(token, newPassword);
    res.json({ success: true, user, message: 'Votre mot de passe a été réinitialisé avec succès !' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifiant et mot de passe requis.' });
    }
    const user = db.login(identifier, password);

    // Déconnexion immédiate de toute ancienne session active sur un autre appareil
    for (const [sId, sess] of sockets.entries()) {
      if (sess.id === user.id) {
        io.to(sId).emit('auth:multiple_sessions', {
          message: 'Connexion interrompue : ce compte a été connecté sur un autre appareil.'
        });
        const targetSock = io.sockets.sockets.get(sId);
        if (targetSock) {
          targetSock.disconnect(true);
        }
        sockets.delete(sId);
      }
    }

    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ error: err.message, code: err.code, userId: err.userId, email: err.email });
  }
});

// Network info endpoint for companion QR code generation
app.get('/api/network-info', (req, res) => {
  try {
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          ips.push({ name, address: net.address });
        }
      }
    }
    const wifi = ips.find(i => /wi-?fi|wlan/i.test(i.name)) || ips[0];
    res.json({ 
      ips, 
      primaryIp: wifi?.address || '192.168.1.51' 
    });
  } catch (err) {
    res.json({ 
      ips: [{ name: 'Wi-Fi', address: '192.168.1.51' }], 
      primaryIp: '192.168.1.51' 
    });
  }
});

// Admin REST endpoints
app.get('/api/admin/users', (req, res) => {
  const adminId = req.headers['x-admin-id'];
  const user = db.getUserById(adminId);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès administrateur requis.' });
  }
  const users = db.getAllUsers();
  res.json({ users, activeGamesCount: games.size, onlineSocketsCount: sockets.size });
});

app.post('/api/admin/users/create', (req, res) => {
  const adminId = req.headers['x-admin-id'];
  const admin = db.getUserById(adminId);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: 'Accès refusé. Droits administrateur requis.' });
  }
  try {
    const { email, password, username, role } = req.body;
    const newUser = db.createUserByAdmin({ email, password, username, role });
    res.json({ success: true, user: newUser });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/admin/toggle-ban', (req, res) => {
  const adminId = req.headers['x-admin-id'];
  const admin = db.getUserById(adminId);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: 'Accès refusé.' });
  }
  try {
    const updated = db.toggleBan(req.body.userId);
    for (const [sId, sess] of sockets.entries()) {
      if (sess.id === req.body.userId) {
        io.to(sId).emit('auth:banned', { message: 'Votre compte a été banni.' });
        const targetSock = io.sockets.sockets.get(sId);
        if (targetSock) targetSock.disconnect(true);
      }
    }
    res.json({ success: true, user: updated });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/admin/user/:id', (req, res) => {
  const adminId = req.headers['x-admin-id'];
  const admin = db.getUserById(adminId);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: 'Accès refusé.' });
  }
  try {
    db.deleteUser(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/admin/user/:id/reset-stats', (req, res) => {
  const adminId = req.headers['x-admin-id'];
  const admin = db.getUserById(adminId);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: 'Accès refusé.' });
  }
  try {
    const updated = db.resetUserStats(req.params.id);
    // Notify user if currently connected
    for (const [sId, sess] of sockets.entries()) {
      if (sess.id === req.params.id) {
        sess.stats = updated.stats;
        io.to(sId).emit('user:stats_updated', { stats: updated.stats });
      }
    }
    res.json({ success: true, user: updated });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/admin/user/:id/toggle-role', (req, res) => {
  const adminId = req.headers['x-admin-id'];
  const admin = db.getUserById(adminId);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: 'Accès refusé. Droits administrateur requis.' });
  }

  const targetId = req.params.id;
  if (targetId === adminId) {
    return res.status(400).json({ error: 'Vous ne pouvez pas modifier votre propre rôle administrateur.' });
  }

  try {
    const updated = db.toggleRole(targetId);

    // Update active socket session if connected
    for (const [sId, sess] of sockets.entries()) {
      if (sess.id === targetId) {
        sess.role = updated.role;
        io.to(sId).emit('user:role_updated', { role: updated.role });
      }
    }
    broadcastLobby();

    res.json({ success: true, user: updated });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// --- TOURNAMENT REST ENDPOINTS ---
app.get('/api/tournament/active', (req, res) => {
  try {
    const tournament = tournamentManager.getActiveTournament();
    const standings = tournament ? tournamentManager.getStandings(tournament) : [];
    res.json({ success: true, tournament, standings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tournament/register', (req, res) => {
  try {
    const { tournamentId, userId } = req.body;
    const user = db.getUserById(userId);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    const tournament = tournamentManager.registerPlayer(tournamentId, user);
    const standings = tournamentManager.getStandings(tournament);
    io.emit('tournament:updated', { tournament, standings });
    res.json({ success: true, tournament, standings });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/tournament/unregister', (req, res) => {
  try {
    const { tournamentId, userId } = req.body;
    const tournament = tournamentManager.unregisterPlayer(tournamentId, userId);
    const standings = tournamentManager.getStandings(tournament);
    io.emit('tournament:updated', { tournament, standings });
    res.json({ success: true, tournament, standings });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/tournament/admin/start', (req, res) => {
  const adminId = req.headers['x-admin-id'];
  const admin = db.getUserById(adminId);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
  }
  try {
    const { tournamentId, maxPlayersLimit } = req.body;
    const tournament = tournamentManager.startTournament(tournamentId, maxPlayersLimit);
    const standings = tournamentManager.getStandings(tournament);
    io.emit('tournament:updated', { tournament, standings });
    res.json({ success: true, tournament, standings });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/tournament/admin/prizes', (req, res) => {
  const adminId = req.headers['x-admin-id'];
  const admin = db.getUserById(adminId);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
  }
  try {
    const { tournamentId, prizes } = req.body;
    const tournament = tournamentManager.setPrizes(tournamentId, prizes);
    const standings = tournamentManager.getStandings(tournament);
    io.emit('tournament:updated', { tournament, standings });
    res.json({ success: true, tournament, standings });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/tournament/admin/start-finals', (req, res) => {
  const adminId = req.headers['x-admin-id'];
  const admin = db.getUserById(adminId);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
  }
  try {
    const { tournamentId } = req.body;
    const tournament = tournamentManager.startFinals(tournamentId);
    const standings = tournamentManager.getStandings(tournament);
    io.emit('tournament:updated', { tournament, standings });
    res.json({ success: true, tournament, standings });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/tournament/admin/notify-winners', async (req, res) => {
  const adminId = req.headers['x-admin-id'];
  const admin = db.getUserById(adminId);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
  }
  try {
    const { tournamentId, adminNote } = req.body;
    const tournament = tournamentManager.tournaments.get(tournamentId);
    if (!tournament || !tournament.winners) {
      return res.status(400).json({ error: 'Le tournoi n\'est pas encore terminé ou aucun vainqueur désigné.' });
    }

    const { first, second, third } = tournament.winners;
    const winnersList = [
      { rank: 1, user: first, prize: tournament.prizes.first },
      { rank: 2, user: second, prize: tournament.prizes.second },
      { rank: 3, user: third, prize: tournament.prizes.third }
    ];

    for (const w of winnersList) {
      if (w.user?.id) {
        const fullUser = db.getUserById(w.user.id);
        if (fullUser && fullUser.email) {
          await mailer.sendTournamentPrizeEmail({
            email: fullUser.email,
            username: fullUser.username,
            rank: w.rank,
            prizeTitle: w.prize,
            tournamentName: tournament.name,
            adminNote: adminNote || ''
          });
        }
      }
    }

    tournament.winners.notifiedAt = new Date().toISOString();
    tournamentManager.saveTournaments();
    io.emit('tournament:updated', { tournament, standings: tournamentManager.getStandings(tournament) });
    res.json({ success: true, message: 'Les 3 vainqueurs ont été notifiés personnellement par email !' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/tournament/admin/reset', (req, res) => {
  const adminId = req.headers['x-admin-id'];
  const admin = db.getUserById(adminId);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
  }
  try {
    const { name, minPlayers, maxPlayers, prizes } = req.body;
    const tournament = tournamentManager.resetTournament({ name, minPlayers, maxPlayers, prizes });
    const standings = tournamentManager.getStandings(tournament);
    io.emit('tournament:updated', { tournament, standings });
    res.json({ success: true, tournament, standings });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/tournament/record-pool-match', (req, res) => {
  try {
    const { tournamentId, matchId, winnerId, score1, score2 } = req.body;
    const result = tournamentManager.recordPoolMatch(tournamentId, matchId, { winnerId, score1, score2 });
    io.emit('tournament:updated', { tournament: result.tournament, standings: result.standings });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/tournament/record-final-match', (req, res) => {
  try {
    const { tournamentId, finalMatchId, winnerId, score1, score2 } = req.body;
    const tournament = tournamentManager.recordFinalMatch(tournamentId, finalMatchId, { winnerId, score1, score2 });
    const standings = tournamentManager.getStandings(tournament);
    io.emit('tournament:updated', { tournament, standings });
    res.json({ success: true, tournament, standings });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// User Statistics endpoints
app.post('/api/user/record-match', (req, res) => {
  try {
    const { userId, matchData } = req.body;
    if (!userId || !matchData) return res.status(400).json({ error: 'Données manquantes.' });
    const updatedUser = db.recordMatchResult(userId, matchData);
    if (!updatedUser) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    res.json({ success: true, user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user/:id/stats', (req, res) => {
  const user = db.getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
  res.json({ stats: user.stats, username: user.username });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', onlineUsers: sockets.size, activeGames: games.size });
});

// Socket Connections
io.on('connection', (socket) => {
  let user = {
    id: 'guest_' + socket.id,
    socketId: socket.id,
    username: 'Invité_' + Math.floor(100 + Math.random() * 900),
    role: 'user',
    status: 'idle'
  };

  sockets.set(socket.id, user);

  socket.on('auth:authenticate', ({ userId }) => {
    const dbUser = db.getUserById(userId);
    if (dbUser && !dbUser.isBanned) {
      // Déconnexion de toute autre session active sur un autre appareil pour ce compte (sauf capteur satellite)
      for (const [existingSocketId, existingUser] of sockets.entries()) {
        const existingSockObj = io.sockets.sockets.get(existingSocketId);
        if (existingSocketId !== socket.id && existingUser.id === dbUser.id && !existingSockObj?.isCompanion) {
          io.to(existingSocketId).emit('auth:multiple_sessions', {
            message: 'Connexion interrompue : ce compte a été connecté sur un autre appareil.'
          });
          const oldSock = io.sockets.sockets.get(existingSocketId);
          if (oldSock) {
            oldSock.disconnect(true);
          }
          sockets.delete(existingSocketId);
        }
      }

      user.id = dbUser.id;
      user.username = dbUser.username;
      user.email = dbUser.email;
      user.role = dbUser.role;
      socket.emit('auth:authenticated', dbUser);
      broadcastLobby();
    }
  });

  socket.emit('auth:init', {
    id: user.id,
    username: user.username,
    role: user.role
  });

  broadcastLobby();

  // Challenge another player (with bestOf format)
  socket.on('challenge:send', ({ toUserId, gameType = '501', bestOf = 3 }) => {
    const targetUser = Array.from(sockets.values()).find(u => u.id === toUserId || u.socketId === toUserId);
    if (!targetUser || targetUser.status !== 'idle') {
      socket.emit('challenge:error', { message: 'Le joueur n\'est pas disponible.' });
      return;
    }

    const challengeId = `chal_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const challengeData = {
      challengeId,
      from: { id: user.id, username: user.username },
      to: { id: targetUser.id, username: targetUser.username },
      gameType,
      bestOf: parseInt(bestOf) || 3
    };

    challenges.set(challengeId, challengeData);
    io.to(targetUser.socketId).emit('challenge:received', challengeData);
  });

  // Respond to challenge
  socket.on('challenge:respond', ({ challengeId, accepted }) => {
    const challenge = challenges.get(challengeId);
    if (!challenge) return;

    challenges.delete(challengeId);

    const fromUser = Array.from(sockets.values()).find(u => u.id === challenge.from.id);
    const toUser = user;

    if (!accepted) {
      if (fromUser) {
        io.to(fromUser.socketId).emit('challenge:declined', {
          username: toUser.username
        });
      }
      return;
    }

    if (!fromUser || fromUser.status !== 'idle' || toUser.status !== 'idle') {
      socket.emit('challenge:error', { message: 'Impossible de lancer la partie.' });
      if (fromUser) io.to(fromUser.socketId).emit('challenge:error', { message: 'Partie annulée.' });
      return;
    }

    const roomId = `room_${Date.now()}`;
    fromUser.status = 'in_game';
    toUser.status = 'in_game';

    const startScore = challenge.gameType === '301' ? 301 : 501;
    const bestOf = challenge.bestOf || 3;
    const legsToWin = Math.ceil(bestOf / 2);

    const gameState = {
      roomId,
      gameType: challenge.gameType,
      bestOf,
      legsToWin,
      startScore,
      phase: 'bull_off', // Starts with Bull-Off (corking)
      bullOffThrows: {},
      currentLegNumber: 1,
      firstLegStarterId: null,
      secondLegStarterId: null,
      turnPlayerId: null,
      players: [
        {
          id: fromUser.id,
          username: fromUser.username,
          currentScore: startScore,
          currentTurnDarts: [],
          legsWon: 0,
          totalThrows: 0
        },
        {
          id: toUser.id,
          username: toUser.username,
          currentScore: startScore,
          currentTurnDarts: [],
          legsWon: 0,
          totalThrows: 0
        }
      ]
    };

    games.set(roomId, gameState);

    const fromSocket = io.sockets.sockets.get(fromUser.socketId);
    if (fromSocket) fromSocket.join(roomId);
    socket.join(roomId);

    io.to(roomId).emit('game:start', {
      roomId,
      gameState,
      initiatorId: fromUser.id
    });

    broadcastLobby();
  });

  // Tournoi : Défier un joueur pour un match officiel de tournoi
  socket.on('tournament:send_challenge', ({ tournamentId, matchId, toUserId, isFinalMatch = false }) => {
    const toUser = Array.from(sockets.values()).find(u => u.id === toUserId);
    if (!toUser) {
      return socket.emit('tournament:challenge_error', { message: 'Ce joueur n\'est actuellement pas connecté.' });
    }
    if (toUser.status === 'in_game') {
      return socket.emit('tournament:challenge_error', { message: 'Ce joueur est actuellement déjà en plein match.' });
    }

    const challengeId = `tourn_chal_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    challenges.set(challengeId, {
      id: challengeId,
      from: { id: user.id, username: user.username },
      to: { id: toUser.id, username: toUser.username },
      tournamentId,
      matchId,
      isFinalMatch: !!isFinalMatch,
      gameType: '501',
      bestOf: 5,
      isTournament: true
    });

    io.to(toUser.socketId).emit('tournament:challenge_received', {
      challengeId,
      tournamentId,
      matchId,
      isFinalMatch: !!isFinalMatch,
      fromUsername: user.username,
      fromUserId: user.id
    });
  });

  socket.on('tournament:respond_challenge', ({ challengeId, accepted }) => {
    const challenge = challenges.get(challengeId);
    if (!challenge) return;
    challenges.delete(challengeId);

    const fromUser = Array.from(sockets.values()).find(u => u.id === challenge.from.id);
    const toUser = user;

    if (!accepted) {
      if (fromUser) {
        io.to(fromUser.socketId).emit('tournament:challenge_declined', {
          username: toUser.username
        });
      }
      return;
    }

    if (!fromUser || fromUser.status !== 'idle' || toUser.status !== 'idle') {
      socket.emit('tournament:challenge_error', { message: 'L\'un des deux joueurs n\'est plus disponible.' });
      if (fromUser) io.to(fromUser.socketId).emit('tournament:challenge_error', { message: 'Match annulé.' });
      return;
    }

    const roomId = `room_tournoi_${Date.now()}`;
    fromUser.status = 'in_game';
    toUser.status = 'in_game';

    const startScore = 501;
    const bestOf = 5; // Best of 5 legs (premier à 3 legs)
    const legsToWin = 3;

    const gameState = {
      roomId,
      gameType: '501',
      bestOf: 5,
      legsToWin: 3,
      startScore: 501,
      isTournamentMatch: true,
      tournamentId: challenge.tournamentId,
      tournamentMatchId: challenge.matchId,
      isFinalMatch: !!challenge.isFinalMatch,
      phase: 'bull_off',
      bullOffThrows: {},
      currentLegNumber: 1,
      firstLegStarterId: null,
      secondLegStarterId: null,
      turnPlayerId: null,
      players: [
        {
          id: fromUser.id,
          username: fromUser.username,
          currentScore: startScore,
          currentTurnDarts: [],
          legsWon: 0,
          totalThrows: 0
        },
        {
          id: toUser.id,
          username: toUser.username,
          currentScore: startScore,
          currentTurnDarts: [],
          legsWon: 0,
          totalThrows: 0
        }
      ]
    };

    games.set(roomId, gameState);

    const fromSocket = io.sockets.sockets.get(fromUser.socketId);
    if (fromSocket) fromSocket.join(roomId);
    socket.join(roomId);

    io.to(roomId).emit('game:start', {
      roomId,
      gameState,
      initiatorId: fromUser.id,
      isTournament: true,
      tournamentId: challenge.tournamentId,
      tournamentMatchId: challenge.matchId
    });

    broadcastLobby();
  });

  // Bull-Off Throw event (closest to center starts leg 1)
  socket.on('game:bull_off_throw', ({ roomId, distance, dart }) => {
    const game = games.get(roomId);
    if (!game || game.phase !== 'bull_off') return;

    game.bullOffThrows[user.id] = {
      distance: Math.round(distance),
      dart,
      username: user.username
    };

    io.to(roomId).emit('game:bull_off_update', {
      playerId: user.id,
      username: user.username,
      distance: Math.round(distance),
      dart
    });

    // Check if both players have thrown at the Bull
    if (Object.keys(game.bullOffThrows).length >= 2) {
      const p1 = game.players[0];
      const p2 = game.players[1];
      const t1 = game.bullOffThrows[p1.id];
      const t2 = game.bullOffThrows[p2.id];

      const winnerId = t1.distance <= t2.distance ? p1.id : p2.id;
      const loserId = winnerId === p1.id ? p2.id : p1.id;
      const winnerName = winnerId === p1.id ? p1.username : p2.username;

      game.firstLegStarterId = winnerId;
      game.secondLegStarterId = loserId;
      game.turnPlayerId = winnerId;
      game.phase = 'playing';

      io.to(roomId).emit('game:bull_off_result', {
        winnerId,
        winnerName,
        p1: { id: p1.id, username: p1.username, distance: t1.distance },
        p2: { id: p2.id, username: p2.username, distance: t2.distance },
        gameState: game
      });
    }
  });

  // WebRTC Signaling
  socket.on('webrtc:signal', ({ roomId, signal }) => {
    socket.to(roomId).emit('webrtc:signal', {
      senderId: user.id,
      signal
    });
  });

  // Dart Throw event
  socket.on('game:throw_dart', ({ roomId, dart }) => {
    const game = games.get(roomId);
    if (!game || game.phase !== 'playing') return;

    const currentPlayer = game.players.find(p => p.id === game.turnPlayerId);
    if (!currentPlayer || currentPlayer.id !== user.id) return;

    const points = (dart.score || 0) * (dart.multiplier || 1);
    const prevScore = currentPlayer.currentScore;
    const nextScore = prevScore - points;

    let isBust = false;
    let isWin = false;

    if (nextScore < 0 || nextScore === 1) {
      isBust = true;
    } else if (nextScore === 0) {
      // Règle officielle PDC / DartsMa : La victoire de manche doit impérativement se faire sur un Double ou Bullseye
      if (dart.multiplier === 2 || dart.ring === 'DOUBLE_BULL') {
        isWin = true;
      } else {
        isBust = true; // Bust si terminaison sur simple ou triple
      }
    }

    const recordedDart = {
      ...dart,
      points,
      isBust,
      isWin,
      timestamp: Date.now()
    };

    currentPlayer.currentTurnDarts.push(recordedDart);
    currentPlayer.totalThrows += 1;

    const turnTotal = currentPlayer.currentTurnDarts.reduce((sum, d) => sum + (d.isBust ? 0 : d.points), 0);

    if (isWin) {
      currentPlayer.matchPoints = (currentPlayer.matchPoints || 0) + prevScore;
      currentPlayer.currentScore = 0;
      currentPlayer.legsWon += 1;

      const isMatchOver = currentPlayer.legsWon >= game.legsToWin;

      if (isMatchOver) {
        io.to(roomId).emit('game:match_won', {
          winnerId: currentPlayer.id,
          winnerName: currentPlayer.username,
          gameState: game,
          dart: recordedDart,
          turnTotal
        });

        // Record stats for both players
        try {
          const loserPlayer = game.players.find(p => p.id !== currentPlayer.id);
          const totalScoredWinner = currentPlayer.matchPoints || (game.startScore * currentPlayer.legsWon);
          const totalScoredLoser = loserPlayer 
            ? (loserPlayer.matchPoints || ((game.startScore * loserPlayer.legsWon) + (game.startScore - loserPlayer.currentScore)))
            : 0;

          const updatedWinner = db.recordMatchResult(currentPlayer.id, {
            isWin: true,
            legsWon: currentPlayer.legsWon,
            legsLost: loserPlayer ? loserPlayer.legsWon : 0,
            dartsThrown: currentPlayer.totalThrows,
            pointsScored: totalScoredWinner,
            opponentName: loserPlayer ? loserPlayer.username : 'Adversaire',
            gameType: game.gameType
          });

          if (loserPlayer) {
            const updatedLoser = db.recordMatchResult(loserPlayer.id, {
              isWin: false,
              legsWon: loserPlayer.legsWon,
              legsLost: currentPlayer.legsWon,
              dartsThrown: loserPlayer.totalThrows,
              pointsScored: totalScoredLoser,
              opponentName: currentPlayer.username,
              gameType: game.gameType
            });
            if (updatedLoser) {
              const loserSocket = io.sockets.sockets.get(loserPlayer.id);
              if (loserSocket) loserSocket.emit('user:stats_updated', updatedLoser);
            }
          }

          if (updatedWinner) {
            socket.emit('user:stats_updated', updatedWinner);
          }
        } catch (e) {
          console.warn('Error recording online match stats:', e);
        }

        // Si le match fait partie d'un tournoi officiel, enregistrer le résultat immédiatement
        if (game.isTournamentMatch && game.tournamentId && game.tournamentMatchId) {
          try {
            const loserPlayer = game.players.find(p => p.id !== currentPlayer.id);
            const winnerLegs = currentPlayer.legsWon;
            const loserLegs = loserPlayer ? loserPlayer.legsWon : 0;
            const score1 = game.players[0].id === currentPlayer.id ? winnerLegs : loserLegs;
            const score2 = game.players[1].id === currentPlayer.id ? winnerLegs : loserLegs;

            if (game.isFinalMatch) {
              tournamentManager.recordFinalMatch(game.tournamentId, game.tournamentMatchId, {
                winnerId: currentPlayer.id,
                score1,
                score2
              });
            } else {
              tournamentManager.recordPoolMatch(game.tournamentId, game.tournamentMatchId, {
                winnerId: currentPlayer.id,
                score1,
                score2
              });
            }

            const t = tournamentManager.getActiveTournament();
            io.emit('tournament:updated', {
              tournament: t,
              standings: tournamentManager.getStandings(t)
            });
            console.log(`🏆 [Tournoi] Résultat match enregistré : ${game.players[0].username} ${score1} - ${score2} ${game.players[1].username}`);
          } catch (tErr) {
            console.error('Erreur enregistrement résultat match tournoi:', tErr);
          }
        }
      } else {
        io.to(roomId).emit('game:leg_won', {
          winnerId: currentPlayer.id,
          winnerName: currentPlayer.username,
          gameState: game,
          dart: recordedDart,
          turnTotal
        });

        // Prepare next leg with turn alternation
        setTimeout(() => {
          if (games.has(roomId)) {
            game.players.forEach(p => {
              p.currentScore = game.startScore;
              p.currentTurnDarts = [];
            });
            game.currentLegNumber = (game.currentLegNumber || 1) + 1;
            // Alternance des départs de manche : Manche impaire = vainqueur du bull, Manche paire = l'autre
            game.turnPlayerId = (game.currentLegNumber % 2 === 1) ? game.firstLegStarterId : game.secondLegStarterId;
            io.to(roomId).emit('game:next_leg', { gameState: game });
          }
        }, 4000);
      }
      return;
    }

    if (isBust) {
      const priorPoints = currentPlayer.currentTurnDarts.slice(0, -1).reduce((s, d) => s + (d.isBust ? 0 : d.points), 0);
      currentPlayer.currentScore = prevScore + priorPoints;

      io.to(roomId).emit('game:bust', {
        playerId: currentPlayer.id,
        gameState: game,
        dart: recordedDart,
        turnTotal
      });

      setTimeout(() => {
        if (games.has(roomId)) {
          currentPlayer.currentTurnDarts = [];
          game.turnPlayerId = game.players.find(p => p.id !== currentPlayer.id).id;
          io.to(roomId).emit('game:update', { gameState: game, newRound: true });
        }
      }, 2000);
      return;
    }

    currentPlayer.currentScore = nextScore;
    currentPlayer.matchPoints = (currentPlayer.matchPoints || 0) + points;

    if (currentPlayer.currentTurnDarts.length >= 3) {
      io.to(roomId).emit('game:update', {
        gameState: game,
        lastDart: recordedDart,
        turnTotal,
        dartIndex: 3
      });

      setTimeout(() => {
        if (games.has(roomId)) {
          currentPlayer.currentTurnDarts = [];
          game.turnPlayerId = game.players.find(p => p.id !== currentPlayer.id).id;
          io.to(roomId).emit('game:update', { gameState: game, newRound: true });
        }
      }, 2000);
    } else {
      io.to(roomId).emit('game:update', {
        gameState: game,
        lastDart: recordedDart,
        turnTotal,
        dartIndex: currentPlayer.currentTurnDarts.length
      });
    }
  });

  // Undo last dart in turn
  socket.on('game:undo_dart', ({ roomId }) => {
    const game = games.get(roomId);
    if (!game) return;
    const currentPlayer = game.players.find(p => p.id === game.turnPlayerId);
    if (!currentPlayer || currentPlayer.id !== user.id) return;

    if (currentPlayer.currentTurnDarts.length > 0) {
      const removed = currentPlayer.currentTurnDarts.pop();
      if (!removed.isBust) {
        currentPlayer.currentScore += removed.points;
        currentPlayer.matchPoints = Math.max(0, (currentPlayer.matchPoints || 0) - removed.points);
      }
      currentPlayer.totalThrows = Math.max(0, currentPlayer.totalThrows - 1);
      io.to(roomId).emit('game:update', { gameState: game });
    }
  });

  // Forfeit / Abandon Game
  socket.on('game:forfeit', ({ roomId }) => {
    const game = games.get(roomId);
    if (!game) return;

    const forfeiter = game.players.find(p => p.id === user.id);
    const winner = game.players.find(p => p.id !== user.id);

    if (forfeiter && winner) {
      try {
        db.recordMatchResult(forfeiter.id, {
          isWin: false,
          legsWon: forfeiter.legsWon || 0,
          legsLost: game.legsToWin,
          dartsThrown: forfeiter.totalThrows || 0,
          pointsScored: forfeiter.matchPoints || 0,
          opponentName: winner.username,
          gameType: game.gameType
        });

        db.recordMatchResult(winner.id, {
          isWin: true,
          legsWon: game.legsToWin,
          legsLost: forfeiter.legsWon || 0,
          dartsThrown: winner.totalThrows || 0,
          pointsScored: winner.matchPoints || 0,
          opponentName: forfeiter.username,
          gameType: game.gameType
        });
      } catch (e) {
        console.warn('Error recording forfeit stats:', e);
      }

      // Tournoi officiel : enregistrement du forfait
      if (game.isTournamentMatch && game.tournamentId && game.tournamentMatchId) {
        try {
          const winnerLegs = game.legsToWin;
          const loserLegs = forfeiter.legsWon || 0;
          const score1 = game.players[0].id === winner.id ? winnerLegs : loserLegs;
          const score2 = game.players[1].id === winner.id ? winnerLegs : loserLegs;

          if (game.isFinalMatch) {
            tournamentManager.recordFinalMatch(game.tournamentId, game.tournamentMatchId, {
              winnerId: winner.id,
              score1,
              score2
            });
          } else {
            tournamentManager.recordPoolMatch(game.tournamentId, game.tournamentMatchId, {
              winnerId: winner.id,
              score1,
              score2
            });
          }

          const t = tournamentManager.getActiveTournament();
          io.emit('tournament:updated', {
            tournament: t,
            standings: tournamentManager.getStandings(t)
          });
        } catch (tErr) {
          console.error('Erreur enregistrement forfait tournoi:', tErr);
        }
      }

      io.to(roomId).emit('game:forfeited', {
        forfeiterId: forfeiter.id,
        forfeiterName: forfeiter.username,
        winnerId: winner.id,
        winnerName: winner.username
      });

      games.delete(roomId);
      user.status = 'idle';
      const winnerUser = Array.from(sockets.values()).find(s => s.id === winner.id);
      if (winnerUser) winnerUser.status = 'idle';
      broadcastLobby();
    }
  });

  // Leave Game
  socket.on('game:leave', ({ roomId }) => {
    if (games.has(roomId)) {
      io.to(roomId).emit('game:opponent_left', { leaverId: user.id });
      games.delete(roomId);
    }
    user.status = 'idle';
    broadcastLobby();
  });

  // Companion Camera Sensor Socket Events
  socket.on('companion:join', ({ roomId, deviceName }) => {
    socket.isCompanion = true;
    socket.companionRoomId = roomId;
    socket.join(roomId);
    io.to(roomId).emit('companion:status', {
      connected: true,
      deviceName: deviceName || 'Caméra Satellite',
      socketId: socket.id
    });
  });

  socket.on('companion:leave', ({ roomId }) => {
    socket.leave(roomId);
    socket.isCompanion = false;
    socket.companionRoomId = null;
    io.to(roomId).emit('companion:status', { connected: false });
  });

  socket.on('companion:dart_detected', ({ roomId, dart, deviceName, timestamp }) => {
    io.to(roomId).emit('companion:dart_received', {
      dart,
      deviceName: deviceName || 'Caméra Satellite',
      timestamp: timestamp || Date.now()
    });
  });

  // Master device registers companion room (for Solo / Bot / PvP matches)
  socket.on('master:register_companion_room', ({ roomId }) => {
    socket.join(roomId);
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (socket.companionRoomId) {
      io.to(socket.companionRoomId).emit('companion:status', { connected: false });
    }
    for (const [roomId, game] of games.entries()) {
      if (game.players.some(p => p.id === user.id)) {
        io.to(roomId).emit('game:opponent_left', { leaverId: user.id });
        games.delete(roomId);
      }
    }
    sockets.delete(socket.id);
    broadcastLobby();
  });
});

// Fallback to client SPA for any non-API route
app.use((req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(clientDist, 'index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎯 DartsMind Server running on http://0.0.0.0:${PORT}`);
});
