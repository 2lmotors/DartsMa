const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const TOURNAMENTS_FILE = path.join(DATA_DIR, 'tournaments.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class TournamentManager {
  constructor() {
    this.tournaments = new Map();
    this.loadTournaments();
    this.ensureActiveTournament();
  }

  loadTournaments() {
    try {
      if (fs.existsSync(TOURNAMENTS_FILE)) {
        const raw = fs.readFileSync(TOURNAMENTS_FILE, 'utf8');
        const list = JSON.parse(raw);
        for (const t of list) {
          this.tournaments.set(t.id, t);
        }
      }
    } catch (e) {
      console.error('Erreur chargement tournaments.json:', e);
    }
  }

  saveTournaments() {
    try {
      const list = Array.from(this.tournaments.values());
      fs.writeFileSync(TOURNAMENTS_FILE, JSON.stringify(list, null, 2), 'utf8');
    } catch (e) {
      console.error('Erreur sauvegarde tournaments.json:', e);
    }
  }

  ensureActiveTournament() {
    const active = Array.from(this.tournaments.values()).find(t => t.status !== 'completed' && t.status !== 'cancelled');
    if (!active) {
      this.createTournament({
        name: 'Grand Tournoi DartsMa Live - Saison 1',
        minPlayers: 6,
        maxPlayers: 16,
        prizes: {
          first: 'Trophée DartsMa Or 🏆 + 100€ de dotation',
          second: 'Trophée DartsMa Argent 🥈 + Cible Pro Blade 6',
          third: 'Trophée DartsMa Bronze 🥉 + Lot de Fléchettes Tungstène'
        }
      });
    }
  }

  createTournament(options = {}) {
    const id = 'tournoi_' + Date.now();
    const tournament = {
      id,
      name: options.name || 'Tournoi DartsMa Live',
      minPlayers: Math.max(6, options.minPlayers || 6),
      maxPlayers: Math.min(16, Math.max(6, options.maxPlayers || 16)),
      status: 'registration', // 'registration' | 'in_progress' | 'finals' | 'completed'
      createdAt: new Date().toISOString(),
      startedAt: null,
      deadlineAt: null, // exactly 1 week after startedAt
      completedAt: null,
      bestOf: 5, // Best of 5 legs (premier à 3 legs)
      prizes: options.prizes || {
        first: 'Trophée DartsMa Or 🏆 + 100€ de dotation',
        second: 'Trophée DartsMa Argent 🥈 + Cible Pro Blade 6',
        third: 'Trophée DartsMa Bronze 🥉 + Lot de Fléchettes Tungstène'
      },
      participants: [], // array of { id, username, email, registeredAt }
      poolMatches: [], // array of { id, player1: {id, username}, player2: {id, username}, played, score1, score2, winnerId, playedAt }
      finals: {
        semiFinal1: null, // { id, player1, player2, played, score1, score2, winnerId }
        semiFinal2: null,
        grandFinal: null, // 1st vs 2nd
        smallFinal: null  // 3rd vs 4th
      },
      winners: null // { first, second, third, fourth, notifiedAt }
    };

    this.tournaments.set(id, tournament);
    this.saveTournaments();
    return tournament;
  }

  getActiveTournament() {
    this.loadTournaments();
    let active = Array.from(this.tournaments.values()).find(t => t.status !== 'completed' && t.status !== 'cancelled');
    if (!active) {
      // Return the most recent tournament
      const all = Array.from(this.tournaments.values());
      active = all[all.length - 1];
    }
    return active || null;
  }

  registerPlayer(tournamentId, user) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) throw new Error('Tournoi introuvable');
    if (tournament.status !== 'registration') {
      throw new Error('Les inscriptions pour ce tournoi sont fermées.');
    }
    if (tournament.participants.length >= tournament.maxPlayers) {
      throw new Error(`Le tournoi est complet (maximum ${tournament.maxPlayers} joueurs).`);
    }
    if (tournament.participants.some(p => p.id === user.id)) {
      throw new Error('Vous êtes déjà inscrit à ce tournoi.');
    }

    tournament.participants.push({
      id: user.id,
      username: user.username,
      email: user.email,
      registeredAt: new Date().toISOString()
    });

    this.saveTournaments();
    return tournament;
  }

  unregisterPlayer(tournamentId, userId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) throw new Error('Tournoi introuvable');
    if (tournament.status !== 'registration') {
      throw new Error('Impossible de se désinscrire : le tournoi a déjà débuté.');
    }

    tournament.participants = tournament.participants.filter(p => p.id !== userId);
    this.saveTournaments();
    return tournament;
  }

  // Admin lock pool and start tournament
  startTournament(tournamentId, maxPlayersLimit = null) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) throw new Error('Tournoi introuvable');
    if (tournament.status !== 'registration') {
      throw new Error('Ce tournoi a déjà démarré.');
    }

    if (maxPlayersLimit) {
      tournament.maxPlayers = Math.min(16, Math.max(6, parseInt(maxPlayersLimit)));
    }

    if (tournament.participants.length < tournament.minPlayers) {
      throw new Error(`Il faut au minimum ${tournament.minPlayers} joueurs pour démarrer le tournoi (actuellement: ${tournament.participants.length}).`);
    }

    // Si plus de joueurs que la limite, limiter
    if (tournament.participants.length > tournament.maxPlayers) {
      tournament.participants = tournament.participants.slice(0, tournament.maxPlayers);
    }

    const now = Date.now();
    tournament.startedAt = new Date(now).toISOString();
    tournament.deadlineAt = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(); // 1 semaine de délai
    tournament.status = 'in_progress';

    // Génération de toutes les confrontations (Round Robin / Poule unique)
    // Chaque joueur affronte chaque autre participant 1 seule fois
    const participants = tournament.participants;
    const matches = [];
    let matchCounter = 1;

    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        matches.push({
          id: `match_${tournament.id}_${matchCounter++}`,
          player1: { id: participants[i].id, username: participants[i].username },
          player2: { id: participants[j].id, username: participants[j].username },
          played: false,
          score1: 0,
          score2: 0,
          winnerId: null,
          playedAt: null
        });
      }
    }

    tournament.poolMatches = matches;
    this.saveTournaments();
    return tournament;
  }

  // Calcule le classement en direct de la poule
  getStandings(tournament) {
    if (!tournament) return [];

    const statsMap = new Map();
    for (const p of tournament.participants) {
      statsMap.set(p.id, {
        id: p.id,
        username: p.username,
        played: 0,
        won: 0,
        lost: 0,
        legsWon: 0,
        legsLost: 0,
        legDiff: 0,
        points: 0
      });
    }

    for (const m of tournament.poolMatches) {
      if (m.played) {
        const s1 = statsMap.get(m.player1.id);
        const s2 = statsMap.get(m.player2.id);

        if (s1 && s2) {
          s1.played += 1;
          s2.played += 1;

          s1.legsWon += m.score1;
          s1.legsLost += m.score2;
          s2.legsWon += m.score2;
          s2.legsLost += m.score1;

          if (m.winnerId === m.player1.id) {
            s1.won += 1;
            s2.lost += 1;
            // Règles de points :
            // Victoire match = 3 pts + 1 pt par leg gagnée (donc 3 + 3 = 6 pts)
            // Défaite = 1 pt par leg gagnée (ex: 2 legs gagnées = 2 pts)
            s1.points += 3 + m.score1;
            s2.points += m.score2;
          } else if (m.winnerId === m.player2.id) {
            s2.won += 1;
            s1.lost += 1;
            s2.points += 3 + m.score2;
            s1.points += m.score1;
          }

          s1.legDiff = s1.legsWon - s1.legsLost;
          s2.legDiff = s2.legsWon - s2.legsLost;
        }
      }
    }

    const standings = Array.from(statsMap.values());

    // Tri : 1. Points (desc) > 2. Victoires (desc) > 3. Différence de legs (desc) > 4. Legs gagnées (desc)
    standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.won !== a.won) return b.won - a.won;
      if (b.legDiff !== a.legDiff) return b.legDiff - a.legDiff;
      return b.legsWon - a.legsWon;
    });

    // Attribuer les rangs (1 à N)
    return standings.map((item, index) => ({
      ...item,
      rank: index + 1
    }));
  }

  // Enregistrement du résultat d'un match de poule
  recordPoolMatch(tournamentId, matchId, { winnerId, score1, score2 }) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) throw new Error('Tournoi introuvable');

    const match = tournament.poolMatches.find(m => m.id === matchId);
    if (!match) throw new Error('Match introuvable');
    if (match.played) throw new Error('Ce match a déjà été disputé.');

    match.played = true;
    match.score1 = parseInt(score1);
    match.score2 = parseInt(score2);
    match.winnerId = winnerId;
    match.playedAt = new Date().toISOString();

    // Vérifier si tous les matchs de poule sont terminés
    const allPlayed = tournament.poolMatches.every(m => m.played);
    if (allPlayed && tournament.status === 'in_progress') {
      // Prêt pour la phase finale !
      console.log(`🎯 [Tournoi ${tournament.name}] Tous les matchs de poule sont terminés !`);
    }

    this.saveTournaments();
    return {
      tournament,
      match,
      standings: this.getStandings(tournament),
      allPlayed
    };
  }

  // Lancement des Finales (Top 4)
  startFinals(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) throw new Error('Tournoi introuvable');

    const standings = this.getStandings(tournament);
    if (standings.length < 4) {
      throw new Error('Il faut au moins 4 joueurs classés pour lancer la phase finale.');
    }

    const p1 = standings[0];
    const p2 = standings[1];
    const p3 = standings[2];
    const p4 = standings[3];

    tournament.status = 'finals';
    tournament.finals = {
      semiFinal1: {
        id: `sf1_${tournament.id}`,
        title: 'Demi-Finale 1 (1er vs 4ème)',
        player1: { id: p1.id, username: p1.username, rank: 1 },
        player2: { id: p4.id, username: p4.username, rank: 4 },
        played: false,
        score1: 0,
        score2: 0,
        winnerId: null,
        playedAt: null
      },
      semiFinal2: {
        id: `sf2_${tournament.id}`,
        title: 'Demi-Finale 2 (2ème vs 3ème)',
        player1: { id: p2.id, username: p2.username, rank: 2 },
        player2: { id: p3.id, username: p3.username, rank: 3 },
        played: false,
        score1: 0,
        score2: 0,
        winnerId: null,
        playedAt: null
      },
      grandFinal: null, // Attente vainqueurs SF1 & SF2
      smallFinal: null  // Attente perdants SF1 & SF2
    };

    this.saveTournaments();
    return tournament;
  }

  // Enregistrement d'un match de phase finale
  recordFinalMatch(tournamentId, finalMatchId, { winnerId, score1, score2 }) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) throw new Error('Tournoi introuvable');
    if (tournament.status !== 'finals') throw new Error('Le tournoi n\'est pas en phase finale.');

    const finals = tournament.finals;
    let target = null;
    let type = '';

    if (finals.semiFinal1 && finals.semiFinal1.id === finalMatchId) {
      target = finals.semiFinal1;
      type = 'sf1';
    } else if (finals.semiFinal2 && finals.semiFinal2.id === finalMatchId) {
      target = finals.semiFinal2;
      type = 'sf2';
    } else if (finals.grandFinal && finals.grandFinal.id === finalMatchId) {
      target = finals.grandFinal;
      type = 'grand';
    } else if (finals.smallFinal && finals.smallFinal.id === finalMatchId) {
      target = finals.smallFinal;
      type = 'small';
    }

    if (!target) throw new Error('Match de finale introuvable');
    if (target.played) throw new Error('Ce match a déjà été disputé.');

    target.played = true;
    target.score1 = parseInt(score1);
    target.score2 = parseInt(score2);
    target.winnerId = winnerId;
    target.playedAt = new Date().toISOString();

    // Si les deux demi-finales sont jouées, générer la Grande Finale et la Petite Finale
    if (finals.semiFinal1?.played && finals.semiFinal2?.played && !finals.grandFinal) {
      const sf1Winner = finals.semiFinal1.winnerId === finals.semiFinal1.player1.id ? finals.semiFinal1.player1 : finals.semiFinal1.player2;
      const sf1Loser = finals.semiFinal1.winnerId === finals.semiFinal1.player1.id ? finals.semiFinal1.player2 : finals.semiFinal1.player1;

      const sf2Winner = finals.semiFinal2.winnerId === finals.semiFinal2.player1.id ? finals.semiFinal2.player1 : finals.semiFinal2.player2;
      const sf2Loser = finals.semiFinal2.winnerId === finals.semiFinal2.player1.id ? finals.semiFinal2.player2 : finals.semiFinal2.player1;

      // Grande Finale (1ère & 2ème place)
      finals.grandFinal = {
        id: `gf_${tournament.id}`,
        title: 'Grande Finale 🏆 (1ère et 2ème place)',
        player1: sf1Winner,
        player2: sf2Winner,
        played: false,
        score1: 0,
        score2: 0,
        winnerId: null,
        playedAt: null
      };

      // Petite Finale (3ème & 4ème place)
      finals.smallFinal = {
        id: `pf_${tournament.id}`,
        title: 'Petite Finale 🥉 (3ème et 4ème place)',
        player1: sf1Loser,
        player2: sf2Loser,
        played: false,
        score1: 0,
        score2: 0,
        winnerId: null,
        playedAt: null
      };
    }

    // Si Grande Finale et Petite Finale sont jouées => Tournoi terminé !
    if (finals.grandFinal?.played && finals.smallFinal?.played) {
      tournament.status = 'completed';
      tournament.completedAt = new Date().toISOString();

      const first = finals.grandFinal.winnerId === finals.grandFinal.player1.id ? finals.grandFinal.player1 : finals.grandFinal.player2;
      const second = finals.grandFinal.winnerId === finals.grandFinal.player1.id ? finals.grandFinal.player2 : finals.grandFinal.player1;
      const third = finals.smallFinal.winnerId === finals.smallFinal.player1.id ? finals.smallFinal.player1 : finals.smallFinal.player2;
      const fourth = finals.smallFinal.winnerId === finals.smallFinal.player1.id ? finals.smallFinal.player2 : finals.smallFinal.player1;

      tournament.winners = {
        first: { ...first, prize: tournament.prizes.first },
        second: { ...second, prize: tournament.prizes.second },
        third: { ...third, prize: tournament.prizes.third },
        fourth: { ...fourth, prize: 'Médaille d\'honneur' },
        notifiedAt: null
      };
    }

    this.saveTournaments();
    return tournament;
  }

  // Mise à jour des prix par l'administrateur
  setPrizes(tournamentId, prizes) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) throw new Error('Tournoi introuvable');
    tournament.prizes = {
      first: prizes.first || tournament.prizes.first,
      second: prizes.second || tournament.prizes.second,
      third: prizes.third || tournament.prizes.third
    };
    this.saveTournaments();
    return tournament;
  }

  // Réinitialiser / Créer un nouveau tournoi (Admin)
  resetTournament(options = {}) {
    // Si un actif existe, le marquer terminé
    for (const t of this.tournaments.values()) {
      if (t.status !== 'completed' && t.status !== 'cancelled') {
        t.status = 'cancelled';
      }
    }
    const newTournament = this.createTournament(options);
    return newTournament;
  }
}

module.exports = new TournamentManager();
