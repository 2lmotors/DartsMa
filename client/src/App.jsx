import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import LobbyView from './components/LobbyView';
import MatchView from './components/MatchView';
import AuthScreen from './components/AuthScreen';
import AdminPanel from './components/AdminPanel';
import StatsView from './components/StatsView';
import TournamentView from './components/TournamentView';
import CompanionCameraView from './components/CompanionCameraView';
import { initAutoWakeLock } from './utils/wakeLock';

// Redirection automatique vers HTTPS sur smartphone et tablette (requis pour l'accès caméra en web)
if (typeof window !== 'undefined' && 
    window.location.protocol === 'http:' && 
    window.location.hostname !== 'localhost' && 
    window.location.hostname !== '127.0.0.1' &&
    window.location.protocol !== 'capacitor:' &&
    !window.location.origin.includes('capacitor://')) {
  const isLocalIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(window.location.hostname);
  let port = '';
  if (window.location.port === '5173') {
    port = ':5173';
  } else if (window.location.port && window.location.port !== '80' && window.location.port !== '443') {
    port = `:${window.location.port}`;
  } else if (isLocalIp && !window.location.port) {
    port = ':5173';
  }
  window.location.replace(`https://${window.location.hostname}${port}${window.location.pathname}${window.location.search}`);
}

// Détection adaptative du serveur backend (compatible Web, PWA, et Apps natives Android / iOS Capacitor)
const getBackendUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:4000';
  const custom = localStorage.getItem('dartsma_server_url');
  if (custom) return custom;
  if (window.location.origin.includes('capacitor://') || window.location.origin.includes('ionic://') || (window.location.hostname === 'localhost' && window.Capacitor)) {
    return 'https://192.168.1.51:4000';
  }
  return window.location.origin;
};

const BACKEND_URL = getBackendUrl();

export default function App() {
  const [socket, setSocket] = useState(null);
  const [companionRoom, setCompanionRoom] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('companion') || null;
    } catch (e) {
      return null;
    }
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('dartsma_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return null; // Require registration / login by default
  });

  const [users, setUsers] = useState([]);
  const [incomingChallenge, setIncomingChallenge] = useState(null);
  const [activeGame, setActiveGame] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isTournamentOpen, setIsTournamentOpen] = useState(false);

  // Prevent smartphone / tablet from sleeping
  useEffect(() => {
    const cleanup = initAutoWakeLock();
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Détection automatique du retour après validation par email (lien ouvert dans le navigateur)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const isVerified = params.get('verified') === '1' || params.get('verified') === 'true';
      const verifiedUserId = params.get('userId');

      if (isVerified && verifiedUserId) {
        fetch(`${BACKEND_URL}/api/auth/user/${verifiedUserId}`)
          .then(r => r.json())
          .then(data => {
            if (data.success && data.user) {
              handleAuthSuccess(data.user);
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          })
          .catch(e => console.error('Erreur chargement profil vérifié :', e));
      }
    } catch (e) {}
  }, [socket]);

  useEffect(() => {
    const newSocket = io(BACKEND_URL, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      const savedUser = localStorage.getItem('dartsma_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          newSocket.emit('auth:authenticate', { userId: parsed.id });
        } catch (e) {}
      }
    });

    newSocket.on('auth:authenticated', (authProfile) => {
      setCurrentUser(authProfile);
      localStorage.setItem('dartsma_user', JSON.stringify(authProfile));
    });

    newSocket.on('user:stats_updated', (updatedUser) => {
      setCurrentUser(updatedUser);
      localStorage.setItem('dartsma_user', JSON.stringify(updatedUser));
    });

    newSocket.on('auth:banned', ({ message }) => {
      alert(message);
      handleLogout();
    });

    newSocket.on('auth:multiple_sessions', ({ message }) => {
      alert(message || 'Connexion interrompue : ce compte a été connecté sur un autre appareil.');
      handleLogout();
    });

    newSocket.on('lobby:users', (userList) => {
      setUsers(userList);
    });

    newSocket.on('challenge:received', (challengeData) => {
      setIncomingChallenge(challengeData);
    });

    newSocket.on('challenge:declined', ({ username }) => {
      alert(`${username} a décliné votre défi.`);
    });

    newSocket.on('challenge:error', ({ message }) => {
      alert(message);
    });

    newSocket.on('game:start', ({ roomId, gameState }) => {
      setActiveGame({
        roomId,
        gameState,
        isBotMatch: false,
        isSoloMatch: false
      });
      setIncomingChallenge(null);
      setIsTournamentOpen(false);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Update username
  const handleUpdateUsername = (newUsername) => {
    if (socket) {
      socket.emit('user:update_name', { username: newUsername });
      setCurrentUser(prev => {
        const updated = { ...prev, username: newUsername };
        localStorage.setItem('dartsma_user', JSON.stringify(updated));
        return updated;
      });
    }
  };

  // Auth Handlers
  const handleAuthSuccess = (userData) => {
    setCurrentUser(userData);
    localStorage.setItem('dartsma_user', JSON.stringify(userData));
    if (socket) {
      socket.emit('auth:authenticate', { userId: userData.id });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('dartsma_user');
    setCurrentUser(null);
  };

  // Challenges Handlers
  const handleSendChallenge = (targetUserId, gameType, bestOf = 3) => {
    if (socket) {
      socket.emit('challenge:send', { toUserId: targetUserId, gameType, bestOf });
    }
  };

  const handleAcceptChallenge = () => {
    if (socket && incomingChallenge) {
      socket.emit('challenge:respond', {
        challengeId: incomingChallenge.challengeId,
        accepted: true
      });
      setIncomingChallenge(null);
    }
  };

  const handleDeclineChallenge = () => {
    if (socket && incomingChallenge) {
      socket.emit('challenge:respond', {
        challengeId: incomingChallenge.challengeId,
        accepted: false
      });
      setIncomingChallenge(null);
    }
  };

  // Start Bot Match (with Best Of and Bull-Off)
  const handleStartBotMatch = (botLevel, gameType, bestOf = 3) => {
    const startScore = gameType === '301' ? 301 : 501;
    const botId = `bot_${botLevel}_${Date.now()}`;
    const botName = `Bot ${botLevel.charAt(0).toUpperCase() + botLevel.slice(1)}`;
    const parsedBestOf = parseInt(bestOf) || 3;
    const legsToWin = Math.ceil(parsedBestOf / 2);

    const botGameState = {
      roomId: `bot_room_${Date.now()}`,
      gameType,
      bestOf: parsedBestOf,
      legsToWin,
      startScore,
      phase: 'bull_off', // Starts with Bull-Off corking!
      currentLegNumber: 1,
      firstLegStarterId: null,
      secondLegStarterId: null,
      turnPlayerId: currentUser.id,
      players: [
        {
          id: currentUser.id,
          username: currentUser.username,
          currentScore: startScore,
          currentTurnDarts: [],
          legsWon: 0,
          totalThrows: 0
        },
        {
          id: botId,
          username: botName,
          currentScore: startScore,
          currentTurnDarts: [],
          legsWon: 0,
          totalThrows: 0
        }
      ]
    };

    setActiveGame({
      roomId: botGameState.roomId,
      gameState: botGameState,
      isBotMatch: true,
      botLevel,
      isSoloMatch: false
    });
  };

  // Start Solo Practice (choix de 1 à 5 legs)
  const handleStartSoloMatch = (gameType, soloLegs = 1) => {
    const startScore = gameType === '301' ? 301 : 501;
    const parsedLegs = parseInt(soloLegs) || 1;

    const soloGameState = {
      roomId: `solo_room_${Date.now()}`,
      gameType,
      bestOf: parsedLegs,
      legsToWin: parsedLegs,
      startScore,
      phase: 'playing', // Solo starts directly in playing mode
      currentLegNumber: 1,
      turnPlayerId: currentUser.id,
      players: [
        {
          id: currentUser.id,
          username: currentUser.username,
          currentScore: startScore,
          currentTurnDarts: [],
          legsWon: 0,
          totalThrows: 0
        }
      ]
    };

    setActiveGame({
      roomId: soloGameState.roomId,
      gameState: soloGameState,
      isBotMatch: false,
      isSoloMatch: true
    });
  };

  const handleLeaveGame = () => {
    if (activeGame && !activeGame.isBotMatch && !activeGame.isSoloMatch && socket) {
      socket.emit('game:leave', { roomId: activeGame.roomId });
    }
    setActiveGame(null);
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-slate-950 text-slate-300">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold">Connexion au serveur DartsMa...</p>
      </div>
    );
  }

  // 0. Dedicated Companion Camera Sensor Mode (No login required for the 2nd camera device)
  if (companionRoom) {
    return (
      <CompanionCameraView
        socket={socket}
        roomId={companionRoom}
        onExit={() => {
          setCompanionRoom(null);
          window.history.replaceState({}, document.title, window.location.pathname);
        }}
      />
    );
  }

  // 1. Strict Requirement: No one can access the application without registration/login!
  if (!currentUser || !currentUser.email) {
    return (
      <AuthScreen
        onAuthSuccess={handleAuthSuccess}
        backendUrl={BACKEND_URL}
        socket={socket}
      />
    );
  }

  // 2. Active Game Screen
  if (activeGame) {
    return (
      <div className="w-full h-[100dvh] max-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
        <MatchView
          socket={socket}
          roomId={activeGame.roomId}
          initialGameState={activeGame.gameState}
          myUserId={currentUser.id}
          onLeaveGame={handleLeaveGame}
          isBotMatch={activeGame.isBotMatch}
          botLevel={activeGame.botLevel}
          isSoloMatch={activeGame.isSoloMatch}
        />
      </div>
    );
  }

  // 3. Main Lobby Screen
  return (
    <div className="w-full h-[100dvh] max-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
      {isStatsOpen ? (
        <StatsView
          currentUser={currentUser}
          onClose={() => setIsStatsOpen(false)}
          backendUrl={BACKEND_URL}
        />
      ) : (
        <LobbyView
          currentUser={currentUser}
          users={users}
          onUpdateUsername={handleUpdateUsername}
          onSendChallenge={handleSendChallenge}
          incomingChallenge={incomingChallenge}
          onAcceptChallenge={handleAcceptChallenge}
          onDeclineChallenge={handleDeclineChallenge}
          onStartBotMatch={handleStartBotMatch}
          onStartSoloMatch={handleStartSoloMatch}
          onOpenAdmin={() => setIsAdminOpen(true)}
          onOpenStats={() => setIsStatsOpen(true)}
          onOpenTournament={() => setIsTournamentOpen(true)}
          onLogout={handleLogout}
          backendUrl={BACKEND_URL}
          onUserUpdated={(u) => {
            setCurrentUser(u);
            localStorage.setItem('dartsma_user', JSON.stringify(u));
          }}
        />
      )}

      {/* Tournament Modal View */}
      <TournamentView
        isOpen={isTournamentOpen}
        onClose={() => setIsTournamentOpen(false)}
        currentUser={currentUser}
        socket={socket}
        backendUrl={BACKEND_URL}
        users={users}
      />

      {/* Admin Panel Modal */}
      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        currentAdmin={currentUser}
        backendUrl={BACKEND_URL}
      />
    </div>
  );
}
