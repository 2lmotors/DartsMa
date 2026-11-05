// Web Audio API Synthesized Sounds & Male Voice Speech Synthesis (French scores & English Referee)

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Dart Thud sound (impact into sisal dartboard)
export function playDartHitSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.8, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {
    console.warn('Audio play error:', e);
  }
}

// Triple / Bull Ding (reward sound)
export function playChimeSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.08); // E6

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    console.warn('Audio play error:', e);
  }
}

// Bust Buzzer
export function playBustSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, ctx.currentTime);
    osc.frequency.setValueAtTime(90, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    console.warn('Audio play error:', e);
  }
}

// Synthesized Realistic Applause & Crowd Cheer (lasts ~4-5 seconds)
export function playApplauseSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const duration = 4.5;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate textured crowd clapping noise
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pink-ish filtering
      lastOut = (lastOut + 0.02 * white) / 1.02;
      // Clapping density bursts
      const burst = Math.sin((i / ctx.sampleRate) * 18 * Math.PI) > 0.4 ? 1.4 : 0.6;
      data[i] = lastOut * 3.5 * burst;
    }

    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = buffer;

    // Bandpass filter for clapping frequency range (800Hz - 2400Hz)
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, ctx.currentTime);
    filter.Q.setValueAtTime(0.8, ctx.currentTime);

    // Gain envelope (fades in quickly, sustains, fades out at 4.5s)
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.01, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.7, ctx.currentTime + 0.3);
    gainNode.gain.setValueAtTime(0.7, ctx.currentTime + 3.5);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    // Crowd cheer harmonic undertone
    const cheerOsc = ctx.createOscillator();
    const cheerGain = ctx.createGain();
    cheerOsc.type = 'triangle';
    cheerOsc.frequency.setValueAtTime(280, ctx.currentTime);
    cheerOsc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 1.2);
    cheerGain.gain.setValueAtTime(0.01, ctx.currentTime);
    cheerGain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.4);
    cheerGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3.8);

    noiseNode.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    cheerOsc.connect(cheerGain);
    cheerGain.connect(ctx.destination);

    noiseNode.start();
    cheerOsc.start();

    noiseNode.stop(ctx.currentTime + duration);
    cheerOsc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn('Applause sound error:', e);
  }
}

let isVoiceMuted = localStorage.getItem('dartsma_voice_muted') === 'true';
// Style de voix : 'natural' (recommandé sur Android / tablette), 'referee' (grave), 'standard'
let voiceStyle = localStorage.getItem('dartsma_voice_style') || 'natural';

export function getVoiceMuted() {
  return isVoiceMuted;
}

export function setVoiceMuted(muted) {
  isVoiceMuted = !!muted;
  localStorage.setItem('dartsma_voice_muted', String(isVoiceMuted));
  if (isVoiceMuted && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function toggleVoiceMute() {
  isVoiceMuted = !isVoiceMuted;
  localStorage.setItem('dartsma_voice_muted', String(isVoiceMuted));
  if (isVoiceMuted && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  return isVoiceMuted;
}

export function getVoiceStyle() {
  return voiceStyle;
}

export function setVoiceStyle(style) {
  voiceStyle = style;
  localStorage.setItem('dartsma_voice_style', style);
}

// Cache persistant des voix du système
let availableVoices = [];

function refreshVoices() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    availableVoices = window.speechSynthesis.getVoices();
  }
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refreshVoices();
  window.speechSynthesis.onvoiceschanged = refreshVoices;
}

// Sélection intelligente de la meilleure voix française adaptée à l'appareil
function getFrenchVoice() {
  if (!('speechSynthesis' in window)) return null;
  if (!availableVoices.length) refreshVoices();
  const voices = availableVoices.length ? availableVoices : window.speechSynthesis.getVoices();
  
  // 1. Chercher d'abord les voix masculines / naturelles françaises reconnues
  const preferredVoice = voices.find(v => 
    v.lang.startsWith('fr') && 
    (v.name.toLowerCase().includes('paul') ||
     v.name.toLowerCase().includes('thomas') ||
     v.name.toLowerCase().includes('nicolas') ||
     v.name.toLowerCase().includes('claude') ||
     v.name.toLowerCase().includes('henri') ||
     v.name.toLowerCase().includes('google') ||
     v.name.toLowerCase().includes('natural') ||
     v.name.toLowerCase().includes('fr-fr-x'))
  );

  if (preferredVoice) return preferredVoice;

  // 2. Repli sur n'importe quelle voix française
  const anyFrench = voices.find(v => v.lang.startsWith('fr'));
  if (anyFrench) return anyFrench;

  return null;
}

// English male referee voice helper (PDC Referee style)
function getEnglishMaleVoice() {
  if (!('speechSynthesis' in window)) return null;
  if (!availableVoices.length) refreshVoices();
  const voices = availableVoices.length ? availableVoices : window.speechSynthesis.getVoices();

  const maleEnglish = voices.find(v => 
    (v.lang.startsWith('en-GB') || v.lang.startsWith('en-US') || v.lang.startsWith('en')) &&
    (v.name.toLowerCase().includes('george') ||
     v.name.toLowerCase().includes('daniel') ||
     v.name.toLowerCase().includes('oliver') ||
     v.name.toLowerCase().includes('arthur') ||
     v.name.toLowerCase().includes('david') ||
     v.name.toLowerCase().includes('male'))
  );

  if (maleEnglish) return maleEnglish;
  return voices.find(v => v.lang.startsWith('en')) || null;
}

export function speakFrench(text) {
  if (isVoiceMuted || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';

    const voice = getFrenchVoice();
    if (voice) utterance.voice = voice;

    // Détection appareil mobile / tablette (ex: Hotwav Tab R9 Plus)
    const isMobileOrTablet = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (voiceStyle === 'referee' && !isMobileOrTablet) {
      utterance.pitch = 0.75;
      utterance.rate = 0.98;
    } else if (voiceStyle === 'high_energy') {
      utterance.pitch = 1.05;
      utterance.rate = 1.05;
    } else {
      // Mode 'natural' (recommandé sur Android) : pitch naturel = voix nette, humaine et non robotisée
      utterance.pitch = 1.0;
      utterance.rate = 1.02;
    }

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('Speech error:', e);
  }
}

// Fonction de test pour valider la voix directement
export function testVoiceAnnouncement() {
  speakFrench("Cent quatre-vingts points ! Flèche en plein cœur.");
}

export function speakEnglishReferee(text) {
  if (isVoiceMuted || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-GB';

    const voice = getEnglishMaleVoice();
    if (voice) utterance.voice = voice;

    // Deep authoritative referee tone (Russ Bray style)
    utterance.pitch = 0.80;
    utterance.rate = 1.00;

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('Speech error:', e);
  }
}

// Annonce après chaque flèche lancée : total joué
export function announceDartScore(totalScored) {
  if (totalScored === 180) {
    speakFrench("Cent quatre-vingts !");
  } else if (totalScored === 0) {
    speakFrench("Zéro point.");
  } else {
    speakFrench(`${totalScored} points.`);
  }
}

// Annonce au début de chaque round : score restant
export function announceRoundStart(remainingScore) {
  speakFrench(`Il vous reste ${remainingScore} points.`);
}

// Quand la leg est finie par le bon score : "Game Shot" en anglais
export function announceGameShot() {
  speakEnglishReferee("Game shot !");
}

// Quand la leg recommence : "Play Game" en anglais
export function announcePlayGame() {
  speakEnglishReferee("Play game !");
}

// Quand le match se termine : "Game and the match" + nom du vainqueur en anglais
export function announceGameAndMatch(winnerName) {
  speakEnglishReferee(`Game and the match, ${winnerName} !`);
}
