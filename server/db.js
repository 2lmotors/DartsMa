const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, key] = storedHash.split(':');
  const hashedBuffer = crypto.scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key, 'hex');
  return crypto.timingSafeEqual(hashedBuffer, keyBuffer);
}

function createDefaultStats() {
  return {
    matchesPlayed: 0,
    matchesWon: 0,
    matchesLost: 0,
    legsPlayed: 0,
    legsWon: 0,
    legsLost: 0,
    totalDartsThrown: 0,
    totalPointsScored: 0,
    averagePerDart: 0,
    averagePerMatch: 0,
    history: []
  };
}

class Database {
  constructor() {
    this.users = new Map();
    this.loadUsers();
    this.ensureDefaultAdmin();
  }

  loadUsers() {
    try {
      if (fs.existsSync(USERS_FILE)) {
        const raw = fs.readFileSync(USERS_FILE, 'utf8');
        const list = JSON.parse(raw);
        for (const u of list) {
          if (!u.stats || !u.stats.history) {
            u.stats = { ...createDefaultStats(), ...(u.stats || {}) };
          }
          if (u.isEmailVerified === undefined) {
            u.isEmailVerified = true; // Rétro-compatibilité pour les comptes existants
          }
          // Sanitize & enforce max 60 and points/darts average formula
          if (u.stats.totalDartsThrown > 0) {
            const raw = u.stats.totalPointsScored / u.stats.totalDartsThrown;
            u.stats.averagePerDart = parseFloat(Math.min(60, raw).toFixed(2));
            u.stats.averagePerMatch = parseFloat(Math.min(60, raw).toFixed(2));
          } else {
            u.stats.averagePerDart = 0;
            u.stats.averagePerMatch = 0;
          }
          if (Array.isArray(u.stats.history)) {
            u.stats.history.forEach(h => {
              if (h.dartsThrown > 0) {
                const raw = h.pointsScored / h.dartsThrown;
                h.matchAverage = Math.min(60, raw).toFixed(2);
                h.dartAverage = Math.min(60, raw).toFixed(2);
              }
            });
          }
          this.users.set(u.id, u);
        }
      }
    } catch (e) {
      console.error('Error loading users:', e);
    }
  }

  saveUsers() {
    try {
      const list = Array.from(this.users.values());
      fs.writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), 'utf8');
    } catch (e) {
      console.error('Error saving users:', e);
    }
  }

  ensureDefaultAdmin() {
    // 1. Compte admin système par défaut
    const defaultAdmin = Array.from(this.users.values()).find(u => u.email.toLowerCase() === 'admin@dartsma.com');
    if (!defaultAdmin) {
      const adminId = 'admin_' + Date.now();
      const admin = {
        id: adminId,
        username: 'Admin',
        email: 'admin@dartsma.com',
        password: hashPassword('admin123'),
        role: 'admin',
        isBanned: false,
        isEmailVerified: true,
        createdAt: new Date().toISOString(),
        stats: createDefaultStats()
      };
      this.users.set(adminId, admin);
      console.log('👑 Compte administrateur système : admin@dartsma.com / admin123');
    }

    // 2. Compte administrateur principal Mario
    let mario = Array.from(this.users.values()).find(u => u.email.toLowerCase() === 'mario@hotmail.com');
    if (mario) {
      mario.role = 'admin';
      mario.password = hashPassword('123456');
      mario.isBanned = false;
      mario.isEmailVerified = true;
      this.users.set(mario.id, mario);
      console.log('👑 Accès Administrateur configuré pour mario@hotmail.com / 123456');
    } else {
      const marioId = 'admin_mario_' + Date.now();
      const newMario = {
        id: marioId,
        username: 'Mario',
        email: 'mario@hotmail.com',
        password: hashPassword('123456'),
        role: 'admin',
        isBanned: false,
        isEmailVerified: true,
        createdAt: new Date().toISOString(),
        stats: createDefaultStats()
      };
      this.users.set(marioId, newMario);
      console.log('👑 Nouveau compte Administrateur créé : mario@hotmail.com / 123456');
    }

    this.saveUsers();
  }

  register(username, email, password) {
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    for (const u of this.users.values()) {
      if (u.username.toLowerCase() === cleanUsername.toLowerCase()) {
        throw new Error('Ce pseudo est déjà utilisé.');
      }
      if (u.email.toLowerCase() === cleanEmail) {
        throw new Error('Cet email est déjà enregistré.');
      }
    }

    const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24h

    const newUser = {
      id: userId,
      username: cleanUsername,
      email: cleanEmail,
      password: hashPassword(password),
      role: 'user',
      isBanned: false,
      isEmailVerified: false,
      verificationToken,
      verificationTokenExpires,
      createdAt: new Date().toISOString(),
      stats: createDefaultStats()
    };

    this.users.set(userId, newUser);
    this.saveUsers();
    return {
      user: this.sanitizeUser(newUser),
      verificationToken
    };
  }

  login(identifier, password) {
    const clean = identifier.trim().toLowerCase();
    let found = null;
    for (const u of this.users.values()) {
      if (u.username.toLowerCase() === clean || u.email.toLowerCase() === clean) {
        found = u;
        break;
      }
    }

    if (!found) {
      throw new Error('Identifiant ou mot de passe incorrect.');
    }

    if (found.isBanned) {
      throw new Error('Ce compte a été suspendu par un administrateur.');
    }

    if (!verifyPassword(password, found.password)) {
      throw new Error('Identifiant ou mot de passe incorrect.');
    }

    if (found.isEmailVerified === false) {
      const err = new Error('Votre adresse email n\'a pas encore été confirmée. Veuillez cliquer sur le lien reçu par email.');
      err.code = 'EMAIL_NOT_VERIFIED';
      err.userId = found.id;
      err.email = found.email;
      throw err;
    }

    return this.sanitizeUser(found);
  }

  verifyEmailToken(token) {
    if (!token || typeof token !== 'string') {
      throw new Error('Jeton de validation manquant.');
    }
    const cleanToken = token.trim();
    let found = null;
    for (const u of this.users.values()) {
      if (u.verificationToken === cleanToken) {
        found = u;
        break;
      }
    }

    if (!found) {
      throw new Error('Ce lien de validation est invalide ou a déjà été utilisé.');
    }

    if (found.verificationTokenExpires && Date.now() > found.verificationTokenExpires) {
      throw new Error('Ce lien de validation a expiré (validité 24 heures).');
    }

    found.isEmailVerified = true;
    delete found.verificationToken;
    delete found.verificationTokenExpires;
    this.saveUsers();
    return this.sanitizeUser(found);
  }

  checkUserVerified(userId) {
    const user = this.users.get(userId);
    if (!user) return { exists: false, isVerified: false };
    return {
      exists: true,
      isVerified: !!user.isEmailVerified,
      user: user.isEmailVerified ? this.sanitizeUser(user) : null
    };
  }

  resendVerification(identifier) {
    const clean = (identifier || '').trim().toLowerCase();
    let found = null;
    for (const u of this.users.values()) {
      if (u.id === identifier || u.email.toLowerCase() === clean || u.username.toLowerCase() === clean) {
        found = u;
        break;
      }
    }
    if (!found) {
      throw new Error('Utilisateur non trouvé.');
    }
    if (found.isEmailVerified) {
      return { alreadyVerified: true, user: this.sanitizeUser(found) };
    }
    const token = crypto.randomBytes(32).toString('hex');
    found.verificationToken = token;
    found.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
    this.saveUsers();
    return {
      alreadyVerified: false,
      user: this.sanitizeUser(found),
      verificationToken: token
    };
  }

  recordMatchResult(userId, matchData) {
    const user = this.users.get(userId);
    if (!user) return null;

    if (!user.stats) {
      user.stats = createDefaultStats();
    }

    const {
      isWin = false,
      legsWon = 0,
      legsLost = 0,
      dartsThrown = 0,
      pointsScored = 0,
      opponentName = 'Adversaire',
      gameType = '501'
    } = matchData;

    user.stats.matchesPlayed = (user.stats.matchesPlayed || 0) + 1;
    if (isWin) {
      user.stats.matchesWon = (user.stats.matchesWon || 0) + 1;
    } else {
      user.stats.matchesLost = (user.stats.matchesLost || 0) + 1;
    }

    user.stats.legsPlayed = (user.stats.legsPlayed || 0) + (legsWon + legsLost);
    user.stats.legsWon = (user.stats.legsWon || 0) + legsWon;
    user.stats.legsLost = (user.stats.legsLost || 0) + legsLost;

    user.stats.totalDartsThrown = (user.stats.totalDartsThrown || 0) + dartsThrown;
    user.stats.totalPointsScored = (user.stats.totalPointsScored || 0) + pointsScored;

    const totalDarts = user.stats.totalDartsThrown;
    const totalPoints = user.stats.totalPointsScored;

    // Calcul de la moyenne par flèche (plafonné à 60 max : maximum 1 flèche = 60 pts)
    const rawAvgDart = totalDarts > 0 ? (totalPoints / totalDarts) : 0;
    const avgPerDart = Math.min(60, rawAvgDart).toFixed(2);

    // Calcul de la moyenne totale (valeur de la partie / flèches jouées, ex: 501 / 18 = 27.83, max 60)
    const rawAvgMatch = totalDarts > 0 ? (totalPoints / totalDarts) : 0;
    const avgPerMatch = Math.min(60, rawAvgMatch).toFixed(2);

    user.stats.averagePerDart = parseFloat(avgPerDart);
    user.stats.averagePerMatch = parseFloat(avgPerMatch);

    // Add match entry to history (avec moyenne par flèche plafonnée à 60)
    const matchRawAvg = dartsThrown > 0 ? (pointsScored / dartsThrown) : 0;
    const matchSafeAvg = Math.min(60, matchRawAvg).toFixed(2);

    const matchEntry = {
      id: 'match_' + Date.now(),
      date: new Date().toISOString(),
      opponentName,
      gameType,
      isWin,
      legsWon,
      legsLost,
      dartsThrown,
      pointsScored,
      matchAverage: matchSafeAvg,
      dartAverage: matchSafeAvg
    };

    if (!Array.isArray(user.stats.history)) {
      user.stats.history = [];
    }
    user.stats.history.unshift(matchEntry);
    if (user.stats.history.length > 50) {
      user.stats.history.pop();
    }

    this.saveUsers();
    return this.sanitizeUser(user);
  }

  getUserById(id) {
    const user = this.users.get(id);
    return user ? this.sanitizeUser(user) : null;
  }

  getAllUsers() {
    return Array.from(this.users.values()).map(u => this.sanitizeUser(u));
  }

  toggleBan(userId) {
    const user = this.users.get(userId);
    if (!user) throw new Error('Utilisateur non trouvé');
    if (user.role === 'admin') throw new Error('Impossible de bannir un administrateur');
    user.isBanned = !user.isBanned;
    this.saveUsers();
    return this.sanitizeUser(user);
  }

  toggleRole(userId) {
    const user = this.users.get(userId);
    if (!user) throw new Error('Utilisateur non trouvé');
    user.role = user.role === 'admin' ? 'user' : 'admin';
    this.saveUsers();
    return this.sanitizeUser(user);
  }

  deleteUser(userId) {
    const user = this.users.get(userId);
    if (!user) throw new Error('Utilisateur non trouvé');
    if (user.role === 'admin') throw new Error('Impossible de supprimer un administrateur');
    this.users.delete(userId);
    this.saveUsers();
    return true;
  }

  resetUserStats(userId) {
    const user = this.users.get(userId);
    if (!user) throw new Error('Utilisateur non trouvé');
    user.stats = createDefaultStats();
    this.saveUsers();
    return this.sanitizeUser(user);
  }

  createUserByAdmin({ email, password, username, role = 'user' }) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) throw new Error('Adresse email requise.');
    if (!password || password.trim().length < 4) throw new Error('Le mot de passe doit comporter au moins 4 caractères.');

    let cleanUsername = (username || '').trim();
    if (!cleanUsername) {
      cleanUsername = cleanEmail.split('@')[0];
    }

    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === cleanEmail) {
        throw new Error('Cet email est déjà enregistré.');
      }
      if (u.username.toLowerCase() === cleanUsername.toLowerCase()) {
        cleanUsername = `${cleanUsername}_${Math.floor(100 + Math.random() * 900)}`;
      }
    }

    const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const newUser = {
      id: userId,
      username: cleanUsername,
      email: cleanEmail,
      password: hashPassword(password),
      role: role === 'admin' ? 'admin' : 'user',
      isBanned: false,
      isEmailVerified: true, // Créé par l'administrateur => validé d'office
      createdAt: new Date().toISOString(),
      stats: createDefaultStats()
    };

    this.users.set(userId, newUser);
    this.saveUsers();
    return this.sanitizeUser(newUser);
  }

  changePassword(userId, oldPassword, newPassword) {
    const user = this.users.get(userId);
    if (!user) throw new Error('Utilisateur non trouvé.');

    if (!verifyPassword(oldPassword, user.password)) {
      throw new Error('L\'ancien mot de passe est incorrect.');
    }

    if (!newPassword || newPassword.trim().length < 4) {
      throw new Error('Le nouveau mot de passe doit contenir au moins 4 caractères.');
    }

    user.password = hashPassword(newPassword);
    this.saveUsers();
    return this.sanitizeUser(user);
  }

  createPasswordResetToken(email) {
    const cleanEmail = (email || '').trim().toLowerCase();
    let found = null;
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === cleanEmail) {
        found = u;
        break;
      }
    }
    if (!found) {
      throw new Error('Aucun compte n\'est associé à cette adresse email.');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    found.resetPasswordToken = resetToken;
    found.resetPasswordTokenExpires = Date.now() + 60 * 60 * 1000; // 1 heure
    this.saveUsers();
    return {
      user: this.sanitizeUser(found),
      resetToken
    };
  }

  resetPasswordWithToken(token, newPassword) {
    if (!token || typeof token !== 'string') {
      throw new Error('Jeton de réinitialisation invalide.');
    }
    const cleanToken = token.trim();
    let found = null;
    for (const u of this.users.values()) {
      if (u.resetPasswordToken === cleanToken) {
        found = u;
        break;
      }
    }

    if (!found) {
      throw new Error('Ce lien de réinitialisation est invalide ou a déjà été utilisé.');
    }

    if (found.resetPasswordTokenExpires && Date.now() > found.resetPasswordTokenExpires) {
      throw new Error('Ce lien de réinitialisation a expiré (validité 1 heure). Veuillez refaire une demande.');
    }

    if (!newPassword || newPassword.trim().length < 4) {
      throw new Error('Le nouveau mot de passe doit contenir au moins 4 caractères.');
    }

    found.password = hashPassword(newPassword);
    found.isEmailVerified = true;
    delete found.resetPasswordToken;
    delete found.resetPasswordTokenExpires;
    this.saveUsers();
    return this.sanitizeUser(found);
  }

  sanitizeUser(user) {
    const { password, ...safe } = user;
    return safe;
  }
}

module.exports = new Database();
