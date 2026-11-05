import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  ArrowLeft, Camera, Keyboard, Bot, User, Maximize2, RefreshCw, 
  Target, Swords, Volume2, VolumeX, Flag, Smartphone, Sparkles 
} from 'lucide-react';
import CameraVision from './CameraVision';
import OpponentVideo from './OpponentVideo';
import DartboardKeypad from './DartboardKeypad';
import VictoryCelebration from './VictoryCelebration';
import CompanionConnectModal from './CompanionConnectModal';
import VoiceSettingsModal from './VoiceSettingsModal';
import { CHECKOUT_SUGGESTIONS } from '../utils/dartCalculations';
import { aiRefereeVerifyThrow, getAiTacticalAdvice } from '../utils/aiAssistant';
import {
  playDartHitSound,
  playChimeSound,
  playBustSound,
  announceDartScore,
  announceRoundStart,
  announceGameShot,
  announcePlayGame,
  announceGameAndMatch,
  getVoiceMuted,
  toggleVoiceMute
} from '../utils/soundEffects';
import { initAutoWakeLock } from '../utils/wakeLock';
import { calculateBotDart } from '../utils/botEngine';

export default function MatchView({
  socket,
  roomId,
  initialGameState,
  myUserId,
  onLeaveGame,
  isBotMatch = false,
  botLevel = 'pro',
  isSoloMatch = false
}) {
  const [gameState, setGameState] = useState(initialGameState);
  const [inputMode, setInputMode] = useState('camera'); // 'camera' | 'keypad'
  const [matchAnnouncement, setMatchAnnouncement] = useState('');
  const [botLastDart, setBotLastDart] = useState(null);

  // Bull-Off (Corking) State
  const isBullOff = gameState?.phase === 'bull_off';
  const [userBullThrown, setUserBullThrown] = useState(false);
  const [bullOffSummary, setBullOffSummary] = useState('');

  // 5-Second Victory Celebration State
  const [victoryData, setVictoryData] = useState(null);

  // Voice Mute State
  const [isVoiceMuted, setIsVoiceMuted] = useState(() => getVoiceMuted());
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  const handleToggleMute = () => {
    setShowVoiceModal(true);
  };

  // Mobile View Mode
  const [mobileView, setMobileView] = useState('auto');
  const [pipSwapped, setPipSwapped] = useState(false);
  const [isCalibratingCamera, setIsCalibratingCamera] = useState(false);

  // Satellite Companion Camera State
  const [showCompanionModal, setShowCompanionModal] = useState(false);
  const [connectedCompanion, setConnectedCompanion] = useState(null);
  const [companionToast, setCompanionToast] = useState('');
  const handleThrowDartRef = useRef(null);

  // AI Match Assistant & Referee State
  const [isAiRefereeActive, setIsAiRefereeActive] = useState(true);

  const myPlayer = gameState?.players?.find(p => p.id === myUserId);
  const opponentPlayer = gameState?.players?.find(p => p.id !== myUserId);
  const isMyTurn = isBullOff ? (!userBullThrown) : (gameState?.turnPlayerId === myUserId);

  // Dynamic AI Tactical Coach advice for active player
  const currentTurnPlayer = gameState?.players?.find(p => p.id === gameState?.turnPlayerId);
  const currentDartsLeft = Math.max(0, 3 - (currentTurnPlayer?.currentTurnDarts?.length || 0));
  const aiTacticalAdvice = isAiRefereeActive && currentTurnPlayer && !isBullOff
    ? getAiTacticalAdvice(currentTurnPlayer.currentScore, currentDartsLeft)
    : null;

  // Record match result into user database profile
  const recordMatchStats = async (isWin, myLegs, oppLegs, throws, scored, oppName) => {
    try {
      await fetch('/api/user/record-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: myUserId,
          matchData: {
            isWin,
            legsWon: myLegs,
            legsLost: oppLegs,
            dartsThrown: throws,
            pointsScored: scored,
            opponentName: oppName,
            gameType: gameState?.gameType || '501'
          }
        })
      });
    } catch (e) {
      console.warn('Error saving match stats:', e);
    }
  };

  // 1. Screen Wake Lock: Prevent phone / tablet from sleeping
  useEffect(() => {
    const cleanupWakeLock = initAutoWakeLock();
    return () => {
      if (cleanupWakeLock) cleanupWakeLock();
    };
  }, []);

  // Announce remaining score when a new round starts
  useEffect(() => {
    if (!isBullOff && isMyTurn && myPlayer) {
      announceRoundStart(myPlayer.currentScore);
    }
  }, [isMyTurn, isBullOff, gameState?.turnPlayerId]);

  // Online Socket Listeners
  useEffect(() => {
    if (!socket || isBotMatch || isSoloMatch) return;

    const handleUpdate = ({ gameState: updatedState, lastDart, turnTotal }) => {
      setGameState(updatedState);
      if (lastDart) {
        playDartHitSound();
        if (lastDart.points >= 60 || lastDart.ring === 'DOUBLE_BULL') {
          playChimeSound();
        }
        if (turnTotal !== undefined) {
          announceDartScore(turnTotal);
        }
      }
    };

    const handleBullOffResult = ({ winnerId, winnerName, p1, p2, gameState: updatedState }) => {
      setGameState(updatedState);
      const isMe = winnerId === myUserId;
      setMatchAnnouncement(`🎯 ${winnerName} gagne le tir au Bull (${isMe ? p1.distance : p2.distance}mm) et commence !`);
      setTimeout(() => {
        announcePlayGame();
        setMatchAnnouncement('🎯 Play Game !');
        setTimeout(() => setMatchAnnouncement(''), 2000);
      }, 2500);
    };

    const handleBust = ({ playerId, dart, gameState: updatedState }) => {
      setGameState(updatedState);
      playBustSound();
      const bustPlayer = updatedState.players.find(p => p.id === playerId);
      setMatchAnnouncement(`Bust ! - ${bustPlayer?.username}`);
      announceDartScore(0);
      setTimeout(() => setMatchAnnouncement(''), 2500);
    };

    const handleLegWon = ({ winnerName, gameState: updatedState }) => {
      setGameState(updatedState);
      playChimeSound();
      announceGameShot(); // English: "Game Shot !"
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      setMatchAnnouncement(`🎯 Game Shot ! Manche gagnée par ${winnerName}`);
      setTimeout(() => setMatchAnnouncement(''), 3500);
    };

    const handleMatchWon = ({ winnerName, winnerId, gameState: updatedState }) => {
      setGameState(updatedState);
      announceGameAndMatch(winnerName);
      setVictoryData({
        winnerName,
        isMe: winnerId === myUserId,
        finalScore: `${updatedState.players[0].legsWon} - ${updatedState.players[1].legsWon}`
      });
    };

    const handleNextLeg = ({ gameState: updatedState }) => {
      setGameState(updatedState);
      announcePlayGame(); // English: "Play Game !"
      setMatchAnnouncement('🎯 Play Game !');
      setTimeout(() => setMatchAnnouncement(''), 2000);
    };

    const handleOpponentLeft = () => {
      alert("Votre adversaire a quitté la partie.");
      onLeaveGame();
    };

    const handleForfeited = ({ forfeiterId, forfeiterName, winnerId, winnerName }) => {
      const isMe = forfeiterId === myUserId;
      if (isMe) {
        setMatchAnnouncement("🏳️ Vous avez déclaré forfait. Défaite par abandon.");
      } else {
        playChimeSound();
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        setMatchAnnouncement(`🏆 ${forfeiterName} a déclaré forfait ! Victoire accordée !`);
      }

      setTimeout(() => {
        setVictoryData({
          winnerName,
          isMe: winnerId === myUserId,
          finalScore: isMe ? "Défaite par forfait" : "Victoire par forfait"
        });
      }, 2500);
    };

    const handleCompanionStatus = (status) => {
      setConnectedCompanion(status.connected ? status : null);
      if (status.connected) {
        setCompanionToast(`📡 Caméra Satellite connectée (${status.deviceName || 'Smartphone'})`);
        setTimeout(() => setCompanionToast(''), 4000);
      } else {
        setCompanionToast(`📡 Caméra Satellite déconnectée`);
        setTimeout(() => setCompanionToast(''), 3000);
      }
    };

    const handleCompanionDartReceived = ({ dart }) => {
      if (!dart) return;
      setCompanionToast(`🎯 Flèche reçue du capteur satellite (${dart.label})`);
      setTimeout(() => setCompanionToast(''), 3000);

      // Trigger dart throw via ref
      handleThrowDartRef.current?.(dart);
    };

    // Register room on server so companion devices can communicate
    socket.emit('master:register_companion_room', { roomId });

    socket.on('game:update', handleUpdate);
    socket.on('game:bull_off_result', handleBullOffResult);
    socket.on('game:bust', handleBust);
    socket.on('game:leg_won', handleLegWon);
    socket.on('game:match_won', handleMatchWon);
    socket.on('game:next_leg', handleNextLeg);
    socket.on('game:opponent_left', handleOpponentLeft);
    socket.on('game:forfeited', handleForfeited);
    socket.on('companion:status', handleCompanionStatus);
    socket.on('companion:dart_received', handleCompanionDartReceived);

    return () => {
      socket.off('game:update', handleUpdate);
      socket.off('game:bull_off_result', handleBullOffResult);
      socket.off('game:bust', handleBust);
      socket.off('game:leg_won', handleLegWon);
      socket.off('game:match_won', handleMatchWon);
      socket.off('game:next_leg', handleNextLeg);
      socket.off('game:opponent_left', handleOpponentLeft);
      socket.off('game:forfeited', handleForfeited);
      socket.off('companion:status', handleCompanionStatus);
      socket.off('companion:dart_received', handleCompanionDartReceived);
    };
  }, [socket, roomId, isBotMatch, isSoloMatch, myUserId, onLeaveGame]);

  // Bot Turn Simulator (when playing against Bot)
  useEffect(() => {
    if (!isBotMatch || isMyTurn || !gameState || isBullOff) return;

    let timeoutId;
    const bot = gameState.players.find(p => p.id !== myUserId);
    if (!bot) return;

    const playBotDart = (dartIndex) => {
      if (dartIndex >= 3) {
        setTimeout(() => {
          setGameState(prev => ({
            ...prev,
            turnPlayerId: myUserId,
            players: prev.players.map(p => p.id === bot.id ? { ...p, currentTurnDarts: [] } : p)
          }));
        }, 1200);
        return;
      }

      timeoutId = setTimeout(() => {
        const dart = calculateBotDart(bot.currentScore, botLevel);
        const prevScore = bot.currentScore;
        const nextScore = prevScore - dart.points;

        playDartHitSound();
        setBotLastDart(dart);

        let isWin = nextScore === 0;
        let isBust = nextScore < 0 || nextScore === 1;

        if (isWin) {
          const nextLegsWon = bot.legsWon + 1;
          const isMatchOver = nextLegsWon >= (gameState.legsToWin || 2);

          setGameState(prev => ({
            ...prev,
            players: prev.players.map(p => {
              if (p.id === bot.id) {
                return {
                  ...p,
                  currentScore: 0,
                  legsWon: nextLegsWon,
                  currentTurnDarts: [...p.currentTurnDarts, { ...dart, isWin: true }]
                };
              }
              return p;
            })
          }));

          if (isMatchOver) {
            playChimeSound();
            announceGameAndMatch(bot.username);
            const scored = (myPlayer.matchPoints !== undefined) 
              ? myPlayer.matchPoints 
              : ((gameState.startScore * myPlayer.legsWon) + (gameState.startScore - myPlayer.currentScore));
            recordMatchStats(false, myPlayer.legsWon, nextLegsWon, myPlayer.totalThrows, scored, bot.username);

            setVictoryData({
              winnerName: bot.username,
              isMe: false,
              finalScore: `${nextLegsWon} - ${myPlayer.legsWon}`
            });
          } else {
            playChimeSound();
            announceGameShot();
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            setMatchAnnouncement(`🎯 Game Shot ! Manche remportée par ${bot.username}`);

            setTimeout(() => {
              announcePlayGame();
              setGameState(prev => {
                const nextLeg = (prev.currentLegNumber || 1) + 1;
                // Alternance des départs de manche
                const nextStarter = (nextLeg % 2 === 1) ? prev.firstLegStarterId : prev.secondLegStarterId;
                return {
                  ...prev,
                  currentLegNumber: nextLeg,
                  turnPlayerId: nextStarter,
                  players: prev.players.map(p => ({ ...p, currentScore: prev.startScore, currentTurnDarts: [] }))
                };
              });
              setMatchAnnouncement('🎯 Play Game !');
              setTimeout(() => setMatchAnnouncement(''), 2000);
            }, 3500);
          }
          return;
        }

        if (isBust) {
          playBustSound();
          setMatchAnnouncement('Bust du Bot !');
          setTimeout(() => {
            setGameState(prev => ({
              ...prev,
              turnPlayerId: myUserId,
              players: prev.players.map(p => p.id === bot.id ? { ...p, currentTurnDarts: [] } : p)
            }));
            setMatchAnnouncement('');
          }, 1500);
          return;
        }

        // Normal bot dart
        setGameState(prev => {
          const updatedPlayers = prev.players.map(p => {
            if (p.id === bot.id) {
              return {
                ...p,
                currentScore: nextScore,
                totalThrows: p.totalThrows + 1,
                currentTurnDarts: [...p.currentTurnDarts, dart]
              };
            }
            return p;
          });
          return { ...prev, players: updatedPlayers };
        });

        playBotDart(dartIndex + 1);
      }, 1300);
    };

    playBotDart(bot.currentTurnDarts.length);
    return () => clearTimeout(timeoutId);
  }, [isBotMatch, isMyTurn, isBullOff, gameState?.turnPlayerId]);

  // Throw dart handler (Bull-Off or regular Match)
  const handleThrowDart = (dart) => {
    handleThrowDartRef.current = handleThrowDart;
    // A. BULL-OFF PHASE (Tir au centre préalable)
    if (isBullOff) {
      if (userBullThrown) return;
      playDartHitSound();

      // Calculate distance from Bull center in mm (radius 0 to 1 -> 0 to 170mm)
      let distMm = 50;
      if (dart.ring === 'DOUBLE_BULL') distMm = 0;
      else if (dart.ring === 'SINGLE_BULL') distMm = 12;
      else if (dart.normDist !== undefined) distMm = Math.round(dart.normDist * 170);
      else distMm = dart.score === 20 ? 45 : 75;

      setUserBullThrown(true);

      if (isBotMatch) {
        // Bot throws at Bull
        let botDist = 30;
        if (botLevel === 'master') botDist = Math.floor(Math.random() * 14); // 0-14 mm
        else if (botLevel === 'pro') botDist = Math.floor(10 + Math.random() * 25); // 10-35 mm
        else botDist = Math.floor(25 + Math.random() * 55); // 25-80 mm

        const userWins = distMm <= botDist;
        const starterId = userWins ? myUserId : opponentPlayer.id;
        const secondId = userWins ? opponentPlayer.id : myUserId;
        const starterName = userWins ? myPlayer.username : opponentPlayer.username;

        setBullOffSummary(`Vous : ${distMm}mm | Bot : ${botDist}mm`);
        setMatchAnnouncement(`🎯 ${starterName} est le plus proche et commence la 1ère manche !`);

        setTimeout(() => {
          announcePlayGame();
          setGameState(prev => ({
            ...prev,
            phase: 'playing',
            firstLegStarterId: starterId,
            secondLegStarterId: secondId,
            turnPlayerId: starterId,
            currentLegNumber: 1
          }));
          setMatchAnnouncement('🎯 Play Game !');
          setTimeout(() => setMatchAnnouncement(''), 2000);
        }, 2800);
      } else {
        // Online Bull-Off
        socket.emit('game:bull_off_throw', { roomId, distance: distMm, dart });
      }
      return;
    }

    // B. REGULAR MATCH THROW
    if (!isMyTurn) return;
    playDartHitSound();

    if (isBotMatch || isSoloMatch) {
      const prevScore = myPlayer.currentScore;
      const points = dart.score * dart.multiplier;
      const nextScore = prevScore - points;

      let isWin = false;
      let isBust = false;

      // AI Referee Anti-Error Validation
      if (isAiRefereeActive) {
        const verify = aiRefereeVerifyThrow({
          currentScore: prevScore,
          dart,
          turnThrowsCount: myPlayer.currentTurnDarts.length
        });
        if (!verify.valid) return;
        isBust = verify.isBust;
        isWin = verify.isWin;
      } else {
        isBust = nextScore < 0 || nextScore === 1 || (nextScore === 0 && dart.multiplier !== 2 && dart.ring !== 'DOUBLE_BULL');
        isWin = nextScore === 0 && !isBust;
      }

      const recordedDart = {
        ...dart,
        points,
        isBust,
        isWin,
        timestamp: Date.now()
      };

      const newDarts = [...myPlayer.currentTurnDarts, recordedDart];
      const turnTotal = newDarts.reduce((sum, d) => sum + (d.isBust ? 0 : d.points), 0);

      announceDartScore(turnTotal);

      if (isWin) {
        const nextLegsWon = myPlayer.legsWon + 1;
        const targetLegs = gameState.legsToWin || (isSoloMatch ? 1 : 2);
        const isMatchOver = nextLegsWon >= targetLegs;
        const scoredThisDart = prevScore;
        const accumulatedMatchPoints = (myPlayer.matchPoints || 0) + scoredThisDart;

        setGameState(prev => ({
          ...prev,
          players: prev.players.map(p => p.id === myUserId ? {
            ...p,
            currentScore: 0,
            totalThrows: p.totalThrows + 1,
            matchPoints: accumulatedMatchPoints,
            legsWon: nextLegsWon,
            currentTurnDarts: newDarts
          } : p)
        }));

        if (isMatchOver) {
          playChimeSound();
          announceGameAndMatch(myPlayer.username);

          recordMatchStats(
            true,
            nextLegsWon,
            isSoloMatch ? 0 : opponentPlayer.legsWon,
            myPlayer.totalThrows + 1,
            accumulatedMatchPoints,
            isSoloMatch ? 'Entraînement Solo' : opponentPlayer.username
          );

          setVictoryData({
            winnerName: myPlayer.username,
            isMe: true,
            finalScore: `${nextLegsWon} - ${isSoloMatch ? 0 : opponentPlayer.legsWon}`
          });
        } else {
          playChimeSound();
          announceGameShot();
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
          setMatchAnnouncement(`🎯 Game Shot ! Manche gagnée par ${myPlayer.username}`);

          setTimeout(() => {
            announcePlayGame();
            setGameState(prev => {
              const nextLeg = (prev.currentLegNumber || 1) + 1;
              const nextStarter = isSoloMatch
                ? myUserId
                : ((nextLeg % 2 === 1) ? prev.firstLegStarterId : prev.secondLegStarterId);
              return {
                ...prev,
                currentLegNumber: nextLeg,
                turnPlayerId: nextStarter,
                players: prev.players.map(p => ({ ...p, currentScore: prev.startScore, currentTurnDarts: [] }))
              };
            });
            setMatchAnnouncement('🎯 Play Game !');
            setTimeout(() => setMatchAnnouncement(''), 2000);
          }, 3500);
        }
        return;
      }

      if (isBust) {
        playBustSound();
        setMatchAnnouncement('Bust ! Dépassement');
        setTimeout(() => {
          setGameState(prev => ({
            ...prev,
            turnPlayerId: isSoloMatch ? myUserId : opponentPlayer?.id,
            players: prev.players.map(p => p.id === myUserId ? { ...p, currentTurnDarts: [] } : p)
          }));
          setMatchAnnouncement('');
        }, 1500);
        return;
      }

      const nextTurnPlayerId = (!isSoloMatch && newDarts.length >= 3)
        ? opponentPlayer?.id
        : myUserId;

      setGameState(prev => ({
        ...prev,
        players: prev.players.map(p => p.id === myUserId ? {
          ...p,
          currentScore: nextScore,
          totalThrows: p.totalThrows + 1,
          matchPoints: (p.matchPoints || 0) + (isBust ? 0 : points),
          currentTurnDarts: newDarts.length >= 3 ? [] : newDarts
        } : p),
        turnPlayerId: nextTurnPlayerId
      }));
    } else {
      socket.emit('game:throw_dart', { roomId, dart });
    }
  };

  // Undo last dart handler
  const handleUndoDart = () => {
    if (!isMyTurn || isBullOff) return;
    if (isBotMatch || isSoloMatch) {
      if (myPlayer.currentTurnDarts.length > 0) {
        const last = myPlayer.currentTurnDarts[myPlayer.currentTurnDarts.length - 1];
        setGameState(prev => ({
          ...prev,
          players: prev.players.map(p => p.id === myUserId ? {
            ...p,
            currentScore: p.currentScore + last.points,
            totalThrows: Math.max(0, p.totalThrows - 1),
            matchPoints: Math.max(0, (p.matchPoints || 0) - (last.isBust ? 0 : last.points)),
            currentTurnDarts: p.currentTurnDarts.slice(0, -1)
          } : p)
        }));
      }
    } else {
      socket.emit('game:undo_dart', { roomId });
    }
  };

  const getAverage = (player) => {
    if (!player || !player.totalThrows || player.totalThrows === 0) return '0.00';
    const totalScored = (player.matchPoints !== undefined)
      ? player.matchPoints
      : ((gameState.startScore * (player.legsWon + 1)) - player.currentScore);
    const avg = totalScored / player.totalThrows;
    return Math.min(60, avg).toFixed(2);
  };

  const myCheckout = myPlayer?.currentScore <= 170 ? CHECKOUT_SUGGESTIONS[myPlayer?.currentScore] : null;

  const showMyCameraAsPrimary = isSoloMatch || (mobileView === 'auto' ? (isMyTurn ? !pipSwapped : pipSwapped) : mobileView === 'my_cam');

  // Abandonner / Déclarer forfait
  const handleForfeit = () => {
    if (!window.confirm("Êtes-vous sûr de vouloir déclarer forfait et abandonner ce match ?")) {
      return;
    }

    if (isSoloMatch) {
      setMatchAnnouncement("🏳️ Vous déclarez forfait. Partie abandonnée.");
      setTimeout(() => {
        onLeaveGame();
      }, 2000);
      return;
    }

    if (isBotMatch) {
      playBustSound();
      const bot = opponentPlayer;
      const targetLegs = gameState.legsToWin;
      recordMatchStats(false, myPlayer.legsWon, targetLegs, myPlayer.totalThrows, myPlayer.matchPoints || 0, bot.username);
      setMatchAnnouncement(`🏳️ Vous déclarez forfait. Victoire de ${bot.username} !`);
      setTimeout(() => {
        setVictoryData({
          winnerName: bot.username,
          isMe: false,
          finalScore: `Forfait (${targetLegs} - ${myPlayer.legsWon})`
        });
      }, 2000);
      return;
    }

    if (socket && roomId) {
      socket.emit('game:forfeit', { roomId });
      setMatchAnnouncement("🏳️ Vous déclarez forfait.");
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] max-h-[100dvh] w-full max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto bg-slate-950 text-slate-100 overflow-hidden select-none shadow-2xl">
      {/* 5-Second Victory Celebration Overlay with Applause */}
      {victoryData && (
        <VictoryCelebration
          winnerName={victoryData.winnerName}
          isMe={victoryData.isMe}
          finalScore={victoryData.finalScore}
          onFinish={onLeaveGame}
        />
      )}

      {/* 1. Header Bar */}
      <header className="flex items-center justify-between px-2.5 py-1.5 pt-safe bg-slate-900 border-b border-slate-800 shrink-0 z-30">
        <div className="flex items-center gap-1.5">
          <button
            onClick={onLeaveGame}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-90"
            title="Quitter"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1">
            <span className="text-xs font-black tracking-wider text-emerald-400">DARTSMA</span>
            <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold">
              {gameState?.gameType || '501'}
            </span>
            <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.2 rounded font-bold">
              {isSoloMatch ? `${gameState?.legsToWin} leg(s)` : `BO${gameState?.bestOf || 3}`}
            </span>
          </div>
        </div>

        {/* Turn or Bull-Off Pill */}
        <div className="flex items-center">
          {isBullOff ? (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500 text-slate-950 shadow animate-pulse flex items-center gap-1">
              <Target className="w-3.5 h-3.5" />
              TIR AU BULLSEYE
            </span>
          ) : (
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black shadow flex items-center gap-1 ${
              isMyTurn
                ? 'bg-emerald-500 text-slate-950 animate-pulse'
                : 'bg-slate-800 text-slate-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isMyTurn ? 'bg-slate-950' : 'bg-slate-500'}`} />
              {isMyTurn ? 'À VOUS' : (opponentPlayer?.username || 'ADVERSAIRE')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* AI Referee & Tactical Coach Toggle */}
          <button
            onClick={() => setIsAiRefereeActive(!isAiRefereeActive)}
            className={`px-2 py-1 rounded-lg border text-[11px] font-black flex items-center gap-1 transition active:scale-95 shadow cursor-pointer ${
              isAiRefereeActive
                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400'
            }`}
            title="Activer/Désactiver l'Arbitre & Coach IA (anti-erreur et suggestions de checkout)"
          >
            <Bot className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">IA Assist</span>
          </button>

          {/* Satellite Companion Camera Button */}
          <button
            onClick={() => setShowCompanionModal(true)}
            className={`px-2 py-1 rounded-lg border text-[11px] font-black flex items-center gap-1 transition active:scale-95 shadow cursor-pointer ${
              connectedCompanion
                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
            title="Connecter une caméra satellite (smartphone / tablette)"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Cam Satellite</span>
            {connectedCompanion && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          {/* Forfeit button */}
          <button
            onClick={handleForfeit}
            className="px-2 py-1 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-500/50 text-rose-300 text-[11px] font-black flex items-center gap-1 transition active:scale-95 shadow"
            title="Déclarer forfait pour ce match"
          >
            <Flag className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Abandonner</span>
          </button>

          {/* Mute Voice Toggle */}
          <button
            onClick={handleToggleMute}
            className={`p-1.5 rounded-lg border transition active:scale-95 ${
              isVoiceMuted
                ? 'bg-rose-950/80 border-rose-500/50 text-rose-400'
                : 'bg-slate-800 border-slate-700 text-emerald-400 hover:text-emerald-300'
            }`}
            title={isVoiceMuted ? 'Activer la voix' : 'Couper la voix (Mute)'}
          >
            {isVoiceMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Keypad / Camera Toggle */}
          <button
            onClick={() => setInputMode(inputMode === 'camera' ? 'keypad' : 'camera')}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
              inputMode === 'keypad' ? 'bg-emerald-500 text-slate-950 shadow' : 'bg-slate-800 text-slate-200'
            }`}
          >
            {inputMode === 'camera' ? <Keyboard className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
            <span>{inputMode === 'camera' ? 'Pavé' : 'Caméra'}</span>
          </button>
        </div>
      </header>

      {/* AI Assistant Tactical Coach Banner */}
      {isAiRefereeActive && aiTacticalAdvice && isMyTurn && !isBullOff && (
        <div className="w-full px-2 sm:px-4 py-1.5 bg-gradient-to-r from-emerald-950/90 via-slate-900/95 to-emerald-950/90 border-b border-emerald-500/40 text-xs flex items-center justify-between gap-2 shadow-lg shrink-0 z-20 animate-in fade-in">
          <div className="flex items-center gap-1.5 min-w-0">
            <Bot className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
            <div className="truncate">
              <span className="font-black text-emerald-300 mr-1.5">{aiTacticalAdvice.title}</span>
              <span className="text-slate-200 text-[11px]">{aiTacticalAdvice.recommendation}</span>
            </div>
          </div>
          {aiTacticalAdvice.route && (
            <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-0.5 rounded-lg border border-amber-500/40 shrink-0">
              <span className="text-[9px] text-slate-400 uppercase font-bold hidden sm:inline">Route IA :</span>
              <span className="font-mono font-black text-amber-300 text-xs">{aiTacticalAdvice.route}</span>
            </div>
          )}
        </div>
      )}

      {/* Bull-Off Banner (Shown when corking) */}
      {isBullOff && (
        <div className="bg-gradient-to-r from-amber-600 to-yellow-500 text-slate-950 font-black text-center py-1.5 px-3 text-xs uppercase tracking-wide shrink-0 z-20 shadow flex items-center justify-center gap-2">
          <Target className="w-4 h-4 animate-spin" />
          <span>Tir au Bull : Visez le centre ! Le plus proche commence.</span>
          {bullOffSummary && <span className="bg-slate-950/20 px-2 py-0.5 rounded font-mono">{bullOffSummary}</span>}
        </div>
      )}

      {/* 2. Compact Scoreboard */}
      <div className={`grid ${isSoloMatch ? 'grid-cols-1' : 'grid-cols-2'} gap-1.5 px-2 py-1.5 bg-slate-900/80 border-b border-slate-800 shrink-0 z-20`}>
        {/* My Score */}
        <div className={`px-2 py-1.5 rounded-xl border transition-all ${
          isMyTurn && !isBullOff
            ? 'bg-gradient-to-b from-emerald-950/40 to-slate-900 border-emerald-500/60 shadow'
            : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-[11px] leading-none mb-0.5">
            <span className="font-bold text-slate-300 truncate max-w-[100px] flex items-center gap-1">
              <User className="w-3 h-3 text-emerald-400 shrink-0" />
              {myPlayer?.username}
            </span>
            <span className="font-black px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
              L:{myPlayer?.legsWon || 0} / {gameState?.legsToWin || 2}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono leading-none tracking-tight">
              {myPlayer?.currentScore}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              Moy: <b className="text-slate-200">{getAverage(myPlayer)}</b>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1 mt-1">
            {[0, 1, 2].map((idx) => {
              const dart = myPlayer?.currentTurnDarts?.[idx];
              return (
                <div
                  key={idx}
                  className={`h-5 rounded text-[10px] font-black flex items-center justify-center border ${
                    dart
                      ? dart.isBust
                        ? 'bg-rose-950 border-rose-500 text-rose-300'
                        : 'bg-emerald-950 border-emerald-500 text-emerald-300'
                      : 'bg-slate-850 border-slate-800 text-slate-600'
                  }`}
                >
                  {dart ? (dart.isBust ? 'BUST' : dart.label) : '-'}
                </div>
              );
            })}
          </div>

          {myCheckout && (
            <div className="text-[10px] font-bold text-amber-400 text-center truncate mt-0.5">
              🎯 {myCheckout}
            </div>
          )}
        </div>

        {/* Opponent Score */}
        {!isSoloMatch && opponentPlayer && (
          <div className={`px-2 py-1.5 rounded-xl border transition-all ${
            !isMyTurn && !isBullOff
              ? 'bg-gradient-to-b from-rose-950/40 to-slate-900 border-rose-500/60 shadow'
              : 'bg-slate-900/80 border-slate-800'
          }`}>
            <div className="flex items-center justify-between text-[11px] leading-none mb-0.5">
              <span className="font-bold text-slate-300 truncate max-w-[100px] flex items-center gap-1">
                {isBotMatch ? <Bot className="w-3 h-3 text-amber-400 shrink-0" /> : <User className="w-3 h-3 text-rose-400 shrink-0" />}
                {opponentPlayer?.username}
              </span>
              <span className="font-black px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[10px]">
                L:{opponentPlayer?.legsWon || 0} / {gameState?.legsToWin || 2}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono leading-none tracking-tight">
                {opponentPlayer?.currentScore}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Moy: <b className="text-slate-200">{getAverage(opponentPlayer)}</b>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1 mt-1">
              {[0, 1, 2].map((idx) => {
                const dart = opponentPlayer?.currentTurnDarts?.[idx];
                return (
                  <div
                    key={idx}
                    className={`h-5 rounded text-[10px] font-black flex items-center justify-center border ${
                      dart
                        ? dart.isBust
                          ? 'bg-rose-950 border-rose-500 text-rose-300'
                          : 'bg-slate-800 border-slate-700 text-slate-200'
                        : 'bg-slate-850 border-slate-800 text-slate-600'
                    }`}
                  >
                    {dart ? (dart.isBust ? 'BUST' : dart.label) : '-'}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Announcement Notification */}
      {matchAnnouncement && (
        <div className="bg-emerald-500 text-slate-950 font-black text-center py-1 px-3 text-xs uppercase tracking-wider animate-bounce shrink-0 z-20">
          {matchAnnouncement}
        </div>
      )}

      {/* 3. Main Central Arena */}
      <div className="flex-1 min-h-0 relative p-1.5 sm:p-2.5 overflow-hidden flex flex-col items-center justify-center">
        <div className="relative w-full h-full flex flex-col md:flex-row gap-2 items-center justify-center">
          
          {/* Primary View */}
          <div className="w-full h-full relative rounded-2xl overflow-hidden">
            {showMyCameraAsPrimary ? (
              <CameraVision
                onDartDetected={handleThrowDart}
                isMyTurn={isMyTurn}
                disabled={!isMyTurn}
                onCalibrationChange={setIsCalibratingCamera}
              />
            ) : isBotMatch ? (
              <div className={`w-full h-full bg-slate-900 rounded-2xl border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl transition-opacity duration-300 ${isCalibratingCamera ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
                <div className="absolute top-2 left-2 bg-slate-950/80 px-2.5 py-0.5 rounded-full border border-slate-800 flex items-center gap-1 text-[11px] font-bold text-amber-400">
                  <Bot className="w-3.5 h-3.5" /> IA ({botLevel.toUpperCase()})
                </div>

                <div className="relative w-40 h-40 sm:w-52 sm:h-52 rounded-full border-4 border-slate-700 bg-slate-950 flex items-center justify-center shadow-inner">
                  <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border border-slate-800 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full border border-emerald-500/40 flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full bg-red-600 border border-white" />
                    </div>
                  </div>
                  {botLastDart && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center animate-ping">
                      <div className="w-3.5 h-3.5 bg-amber-400 rounded-full" />
                    </div>
                  )}
                </div>

                <div className="mt-2 text-center">
                  <span className="text-[11px] text-slate-400">
                    {botLastDart ? `Lancer IA : ${botLastDart.label} (+${botLastDart.points})` : 'En attente...'}
                  </span>
                </div>
              </div>
            ) : (
              <div className={`w-full h-full transition-opacity duration-300 ${isCalibratingCamera ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
                <OpponentVideo
                  socket={socket}
                  roomId={roomId}
                  myId={myUserId}
                  opponentName={opponentPlayer?.username}
                />
              </div>
            )}
          </div>

          {/* Secondary View (PiP Vignette) */}
          {!isSoloMatch && (
            <div
              onClick={() => setPipSwapped(!pipSwapped)}
              className={`absolute bottom-2 right-2 md:static md:w-full md:h-full w-28 h-28 sm:w-36 sm:h-36 rounded-xl overflow-hidden border-2 border-emerald-500/70 shadow-2xl z-30 cursor-pointer active:scale-95 transition-all duration-300 bg-slate-900 group ${
                isCalibratingCamera ? 'opacity-10 pointer-events-none' : 'opacity-100'
              }`}
              title="Toucher pour permuter l'affichage"
            >
              <div className="w-full h-full pointer-events-none relative">
                {showMyCameraAsPrimary ? (
                  isBotMatch ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-amber-400 text-[10px] font-bold p-1 text-center">
                      <Bot className="w-5 h-5 mb-0.5" />
                      <span>IA ({botLevel})</span>
                      <span className="text-[9px] text-slate-400 truncate">{botLastDart?.label || '-'}</span>
                    </div>
                  ) : (
                    <OpponentVideo
                      socket={socket}
                      roomId={roomId}
                      myId={myUserId}
                      opponentName={opponentPlayer?.username}
                    />
                  )
                ) : (
                  <CameraVision
                    onDartDetected={handleThrowDart}
                    isMyTurn={isMyTurn}
                    disabled={!isMyTurn}
                    onCalibrationChange={setIsCalibratingCamera}
                  />
                )}

                <div className="absolute top-1 right-1 bg-slate-950/80 rounded p-0.5 text-white opacity-80 group-hover:opacity-100">
                  <RefreshCw className="w-3 h-3 text-emerald-400" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Manual Scoring Keypad */}
      {inputMode === 'keypad' && (
        <div className="w-full bg-slate-950 border-t border-slate-800 shrink-0 p-1.5 pb-safe z-30 animate-in slide-in-from-bottom-2">
          <DartboardKeypad
            onThrowDart={handleThrowDart}
            onUndoDart={handleUndoDart}
            canUndo={isMyTurn && !isBullOff && myPlayer?.currentTurnDarts?.length > 0}
            disabled={!isMyTurn}
          />
        </div>
      )}

      {/* Companion Toast Notification */}
      {companionToast && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-emerald-500/60 text-emerald-300 text-xs font-bold px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{companionToast}</span>
        </div>
      )}

      {/* Companion Connect Modal */}
      <CompanionConnectModal
        isOpen={showCompanionModal}
        onClose={() => setShowCompanionModal(false)}
        roomId={roomId}
        connectedCompanion={connectedCompanion}
      />

      {/* Voice & Sound Settings Modal */}
      <VoiceSettingsModal
        isOpen={showVoiceModal}
        onClose={() => {
          setShowVoiceModal(false);
          setIsVoiceMuted(getVoiceMuted());
        }}
      />
    </div>
  );
}
