import React, { useRef, useEffect, useState } from 'react';
import { 
  Camera, RefreshCw, Crosshair, AlertTriangle, ShieldAlert, 
  RotateCcw, Eye, EyeOff, Target, Sparkles, HelpCircle, 
  ChevronLeft, ChevronRight, Zap, Bot, Wand2 
} from 'lucide-react';
import { getScoreFromPolar, RADII, SECTORS } from '../utils/dartCalculations';
import { analyzeCalibrationQuality, autoDetectDartboard } from '../utils/aiAssistant';
import CameraTutorialModal from './CameraTutorialModal';

// Helpers to draw annular sectors for standard dartboard rendering
const polarToCartesian = (cx, cy, r, angleInDegrees) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + (r * Math.cos(angleInRadians)),
    y: cy + (r * Math.sin(angleInRadians))
  };
};

const describeArc = (cx, cy, rInner, rOuter, startAngle, endAngle) => {
  const p1 = polarToCartesian(cx, cy, rOuter, startAngle);
  const p2 = polarToCartesian(cx, cy, rOuter, endAngle);
  const p3 = polarToCartesian(cx, cy, rInner, endAngle);
  const p4 = polarToCartesian(cx, cy, rInner, startAngle);
  const largeArcFlag = Math.abs(endAngle - startAngle) <= 180 ? "0" : "1";
  return `M ${p1.x} ${p1.y} A ${rOuter} ${rOuter} 0 ${largeArcFlag} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rInner} ${rInner} 0 ${largeArcFlag} 0 ${p4.x} ${p4.y} Z`;
};

export default function CameraVision({ onDartDetected, isMyTurn, disabled, onCalibrationChange }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' (front) or 'environment' (back)
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isHttpsRequired, setIsHttpsRequired] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  
  // Par défaut OFF quand la caméra filme pour ne pas masquer la vraie cible
  const [showReferenceBoard, setShowReferenceBoard] = useState(false);
  
  // Transparence réglable de l'araignée (défaut 65% : juste milieu pour voir les fils nettement sans masquer la cible)
  const [spiderOpacity, setSpiderOpacity] = useState(() => {
    const saved = localStorage.getItem('dartsma_spider_opacity');
    return saved ? parseFloat(saved) : 0.65;
  });
  const [showNumbers, setShowNumbers] = useState(true);

  // High Resolution Capture (800, 1024, 1600 px)
  const [captureResolution, setCaptureResolution] = useState(() => {
    const saved = localStorage.getItem('dartsma_capture_res');
    return saved ? parseInt(saved) : 1024;
  });

  // Illuminated Segments during calibration (e.g. '20', 'all', or other sector number)
  const [glowSector, setGlowSector] = useState('20');
  const [showTutorial, setShowTutorial] = useState(false);

  // Calibration parameters (normalized 0 to 1 relative to video dimensions)
  const [calibration, setCalibration] = useState(() => {
    const saved = localStorage.getItem('dartsma_calibration');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        return { cx: 0.5, cy: 0.5, radius: 0.38, rotation: 0, ...parsed };
      } catch (e) {}
    }
    return { cx: 0.5, cy: 0.5, radius: 0.38, rotation: 0 };
  });

  // AI Calibration Diagnostics & Auto-Tuning State
  const [aiFeedback, setAiFeedback] = useState({
    score: 95,
    isGood: true,
    lightQuality: 'Optimal',
    advice: 'IA active : cible prête pour le calibrage.'
  });
  const [isAiAutoTuning, setIsAiAutoTuning] = useState(false);

  // Periodically evaluate calibration quality with AI during calibration
  useEffect(() => {
    if (!isCalibrating || !canvasRef.current) return;
    const interval = setInterval(() => {
      if (canvasRef.current) {
        const quality = analyzeCalibrationQuality(canvasRef.current, calibration);
        setAiFeedback(quality);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [isCalibrating, calibration]);

  const handleAiAutoCalibrate = () => {
    setIsAiAutoTuning(true);
    setTimeout(() => {
      const detected = autoDetectDartboard(canvasRef.current);
      if (detected) {
        saveCalibration({
          cx: detected.cx,
          cy: detected.cy,
          radius: detected.radius,
          rotation: detected.rotation
        });
        setAiFeedback({
          score: detected.confidence || 96,
          isGood: true,
          lightQuality: 'Optimal',
          advice: `IA : Bullseye centré automatiquement (${detected.confidence || 96}% confiance)`
        });
      }
      setIsAiAutoTuning(false);
    }, 450);
  };

  // Notify parent component (e.g. MatchView) when calibration state changes
  useEffect(() => {
    if (onCalibrationChange) {
      onCalibrationChange(isCalibrating);
    }
  }, [isCalibrating, onCalibrationChange]);

  const handleResetZero = () => {
    saveCalibration({ cx: 0.5, cy: 0.5, radius: 0.38, rotation: 0 });
  };

  // Computer Vision Processing State
  const [lastDetectedDart, setLastDetectedDart] = useState(null);
  const [motionStatus, setMotionStatus] = useState('idle');
  const prevFrameRef = useRef(null);
  const stableCountRef = useRef(0);
  const cooldownRef = useRef(0);

  // Dynamic Square Sizing to guarantee 100% circular dartboard on all screens
  const containerRef = useRef(null);
  const [containerDim, setContainerDim] = useState({ width: 400, height: 400 });

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setContainerDim({ width: rect.width, height: rect.height });
        }
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const baseSize = Math.min(containerDim.width, containerDim.height);
  const boardDiameter = Math.max(120, baseSize * (calibration.radius * 2));
  const centerX = containerDim.width * calibration.cx;
  const centerY = containerDim.height * calibration.cy;

  const saveCalibration = (newCalib) => {
    setCalibration(newCalib);
    localStorage.setItem('dartsma_calibration', JSON.stringify(newCalib));
  };

  // Check if browser requires HTTPS for camera
  useEffect(() => {
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setIsHttpsRequired(true);
    }
  }, []);

  const switchToHttps = () => {
    const port = window.location.port ? `:${window.location.port}` : ':5173';
    window.location.href = `https://${window.location.hostname}${port}${window.location.pathname}${window.location.search}`;
  };

  // Start Camera avec cascade de repli résiliente (Hotwav Tab R9 Plus / Android / iPad / PC)
  const startCamera = async (mode = facingMode, res = captureResolution) => {
    setCameraError(null);
    setIsStartingCamera(true);

    // Timeout de sécurité : garantit que l'interface ne reste JAMAIS bloquée sur "Activation en cours..."
    const safetyTimer = setTimeout(() => {
      setIsStartingCamera(false);
    }, 4000);

    // Redirection automatique vers HTTPS si ouvert via HTTP sur tablette distante
    if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setIsHttpsRequired(true);
      clearTimeout(safetyTimer);
      setIsStartingCamera(false);
      switchToHttps();
      return;
    }

    // Vérification de la disponibilité de l'API caméra
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      clearTimeout(safetyTimer);
      setIsStartingCamera(false);
      setCameraError("L'accès caméra n'est pas autorisé ou non supporté par ce navigateur sur cette tablette. Vérifiez les autorisations de votre navigateur.");
      return;
    }

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      // Détection tablette / smartphone (incluant tablettes Android Hotwav et iPad)
      const isMobileOrTablet = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || 
        (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

      let stream = null;

      // Étape 1 : Essai avec contraintes recommandées
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: isMobileOrTablet ? { ideal: 1280, max: 1920 } : { ideal: res },
            height: isMobileOrTablet ? { ideal: 720, max: 1080 } : { ideal: Math.round(res * 0.75) }
          },
          audio: false
        });
      } catch (err1) {
        console.warn('Contraintes optimales rejetées sur tablette, repli facingMode seul:', err1);
        try {
          // Étape 2 : Essai simple avec facingMode idéal sans contrainte de taille
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: mode } },
            audio: false
          });
        } catch (err2) {
          console.warn('Caméra demandée rejetée, repli caméra opposée:', err2);
          try {
            // Étape 3 : Essai caméra opposée (avant/arrière)
            const altMode = mode === 'environment' ? 'user' : 'environment';
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: { ideal: altMode } },
              audio: false
            });
            setFacingMode(altMode);
          } catch (err3) {
            console.warn('Repli universel n\'importe quelle caméra:', err3);
            // Étape 4 : Repli universel standard sans aucune contrainte (100% compatible)
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false
            });
          }
        }
      }

      if (!stream) {
        throw new Error("Impossible d'obtenir un flux vidéo");
      }

      streamRef.current = stream;

      const video = videoRef.current;
      if (video) {
        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('autoplay', 'true');
        video.setAttribute('muted', 'true');
        video.srcObject = stream;

        // Débloquer l'UI IMMÉDIATEMENT (ne pas attendre la résolution de video.play())
        setCameraActive(true);
        setCameraError(null);
        clearTimeout(safetyTimer);
        setIsStartingCamera(false);

        // Lecture asynchrone non-bloquante avec écouteurs d'événements
        const triggerPlay = () => {
          if (video && video.paused) {
            video.play().catch(e => console.warn('Play async attempt:', e));
          }
        };

        triggerPlay();
        video.onloadeddata = triggerPlay;
        video.onloadedmetadata = triggerPlay;
        video.oncanplay = triggerPlay;
      } else {
        setCameraActive(true);
        setCameraError(null);
        clearTimeout(safetyTimer);
        setIsStartingCamera(false);
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      setCameraActive(false);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError("Accès caméra refusé. Sur votre tablette, touchez l'icône de cadenas / paramètres à gauche de l'adresse web pour autoriser l'appareil photo.");
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError("Aucune caméra disponible sur cette tablette.");
      } else {
        setCameraError(`Erreur caméra : ${err.message || 'Impossible d\'activer le flux'}`);
      }
    } finally {
      clearTimeout(safetyTimer);
      setIsStartingCamera(false);
    }
  };

  const handleResolutionChange = (newRes) => {
    setCaptureResolution(newRes);
    localStorage.setItem('dartsma_capture_res', String(newRes));
    startCamera(facingMode, newRes);
  };

  const cycleGlowSector = (delta) => {
    if (glowSector === 'all') {
      setGlowSector('20');
      return;
    }
    const currentIdx = SECTORS.indexOf(parseInt(glowSector));
    const newIdx = (currentIdx + delta + SECTORS.length) % SECTORS.length;
    setGlowSector(String(SECTORS[newIdx]));
  };

  useEffect(() => {
    startCamera(facingMode, captureResolution);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [facingMode]);

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  // Watchdog anti-gel : vérifie et redémarre la lecture si le navigateur mobile met la vidéo en pause
  useEffect(() => {
    if (!cameraActive) return;
    let lastTime = -1;
    let stallCount = 0;

    const watchdog = setInterval(() => {
      const video = videoRef.current;
      if (!video || !video.srcObject) return;

      if (video.paused) {
        video.play().catch(() => {});
      }

      if (video.readyState >= 2 && !video.paused) {
        if (video.currentTime === lastTime) {
          stallCount++;
          if (stallCount >= 2) {
            // Flux potentiellement figé sur une frame : relance la lecture
            video.play().catch(() => {});
          }
        } else {
          stallCount = 0;
          lastTime = video.currentTime;
        }
      }
    }, 1200);

    return () => clearInterval(watchdog);
  }, [cameraActive]);

  const lastFrameTimeRef = useRef(0);

  // Computer Vision Motion Loop
  useEffect(() => {
    if (!cameraActive || isCalibrating || !isMyTurn || disabled) return;

    let animId;
    const processFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        animId = requestAnimationFrame(processFrame);
        return;
      }

      // Limiter le traitement à ~30 FPS pour ne pas surcharger le GPU mobile
      const now = performance.now();
      if (now - lastFrameTimeRef.current < 33) {
        animId = requestAnimationFrame(processFrame);
        return;
      }
      lastFrameTimeRef.current = now;

      const procDim = captureResolution >= 1600 ? 320 : captureResolution >= 1024 ? 256 : 200;
      const width = procDim;
      const height = procDim;
      
      // Ne réallouer la taille canvas que si la résolution a changé
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, width, height);

      const frame = ctx.getImageData(0, 0, width, height);
      const data = frame.data;

      if (cooldownRef.current > 0) {
        cooldownRef.current--;
        prevFrameRef.current = data;
        animId = requestAnimationFrame(processFrame);
        return;
      }

      const prev = prevFrameRef.current;
      if (prev) {
        const cx = calibration.cx * width;
        const cy = calibration.cy * height;
        const rMax = calibration.radius * width;

        let diffCount = 0;
        let weightedX = 0;
        let weightedY = 0;
        let totalDiffWeight = 0;

        for (let y = 0; y < height; y += 2) {
          for (let x = 0; x < width; x += 2) {
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= rMax) {
              const idx = (y * width + x) * 4;
              const lumCurrent = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
              const lumPrev = 0.299 * prev[idx] + 0.587 * prev[idx + 1] + 0.114 * prev[idx + 2];
              const diff = Math.abs(lumCurrent - lumPrev);

              if (diff > 32) {
                diffCount++;
                totalDiffWeight += diff;
                weightedX += x * diff;
                weightedY += y * diff;
              }
            }
          }
        }

        const scaleSq = (procDim / 160) * (procDim / 160);
        const motionThresh = Math.round(28 * scaleSq);
        const stableThresh = Math.round(4 * scaleSq);

        if (diffCount > motionThresh) {
          stableCountRef.current = 0;
          setMotionStatus('motion');
        } else if (diffCount > stableThresh && diffCount <= motionThresh) {
          stableCountRef.current++;
          setMotionStatus('stabilizing');

          if (stableCountRef.current >= 4) {
            const impactX = totalDiffWeight > 0 ? (weightedX / totalDiffWeight) : cx;
            const impactY = totalDiffWeight > 0 ? (weightedY / totalDiffWeight) : cy;

            const normDx = (impactX - cx) / rMax;
            const normDy = (impactY - cy) / rMax;
            const normDist = Math.sqrt(normDx * normDx + normDy * normDy);
            const angleRad = Math.atan2(normDy, normDx);
            const rotRad = ((calibration.rotation || 0) * Math.PI) / 180;
            const adjustedAngle = angleRad - rotRad;

            const scoreResult = getScoreFromPolar(normDist, adjustedAngle);

            setLastDetectedDart({
              ...scoreResult,
              x: impactX / width,
              y: impactY / height,
              timestamp: Date.now()
            });

            setMotionStatus('detected');
            cooldownRef.current = 35;
            stableCountRef.current = 0;

            if (onDartDetected) {
              onDartDetected(scoreResult);
            }
          }
        } else {
          setMotionStatus('idle');
          stableCountRef.current = 0;
        }
      }

      prevFrameRef.current = data;
      animId = requestAnimationFrame(processFrame);
    };

    animId = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(animId);
  }, [cameraActive, isCalibrating, isMyTurn, disabled, calibration, onDartDetected]);

  // Handle direct tap on video/target (Quick manual dart placement)
  const handleTargetTap = (e) => {
    if (!cameraActive || !isMyTurn || isCalibrating) return;

    const rect = containerRef.current ? containerRef.current.getBoundingClientRect() : e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const dx = clickX - centerX;
    const dy = clickY - centerY;
    const boardRadiusPx = boardDiameter / 2;
    const normDist = Math.sqrt(dx * dx + dy * dy) / boardRadiusPx;
    const angleRad = Math.atan2(dy, dx);
    const rotRad = ((calibration.rotation || 0) * Math.PI) / 180;
    const adjustedAngle = angleRad - rotRad;

    const scoreResult = getScoreFromPolar(normDist, adjustedAngle);

    setLastDetectedDart({
      ...scoreResult,
      x: clickX / rect.width,
      y: clickY / rect.height,
      timestamp: Date.now()
    });

    if (onDartDetected) {
      onDartDetected(scoreResult);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center justify-center border border-slate-800">
      {/* Video stream */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`w-full h-full object-cover transition-opacity duration-300 ${cameraActive ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Offscreen Canvas for Frame Differencing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Target interactive overlay */}
      <div
        onClick={handleTargetTap}
        className={`absolute inset-0 cursor-crosshair z-10 ${cameraActive ? 'pointer-events-auto' : 'pointer-events-none'}`}
      >
        {/* Calibrated Target Spider (L'Araignée) & Circular Number Ring */}
        <div
          className={`absolute rounded-full transition-all pointer-events-none select-none ${
            cameraActive && isCalibrating ? 'shadow-2xl shadow-yellow-500/20' : ''
          }`}
          style={{
            position: 'absolute',
            left: `${centerX}px`,
            top: `${centerY}px`,
            width: `${boardDiameter}px`,
            height: `${boardDiameter}px`,
            transform: 'translate(-50%, -50%)',
            aspectRatio: '1 / 1'
          }}
        >
          {/* L'ARAIGNÉE DE LA CIBLE SVG - 100% Circulaire & Rigide */}
          <svg
            viewBox="-12 -12 124 124"
            className="w-full h-full overflow-visible"
            style={{
              transform: `rotate(${calibration.rotation || 0}deg)`,
              transformOrigin: '50px 50px'
            }}
          >
            {/* CIBLE MODÈLE / GABARIT DE RÉFÉRENCE DEVANT L'OBJECTIF (seulement si activé explicitement ou hors caméra) */}
            {(showReferenceBoard || !cameraActive) && (
              <g className="select-none transition-opacity duration-300" opacity={cameraActive ? 0.22 : 0.95}>
                {/* Anneau extérieur noir (Catch ring) */}
                <circle cx="50" cy="50" r="51.5" fill="#09090b" stroke="#27272a" strokeWidth="0.8" />
                
                {/* Les 20 secteurs avec lits Double, Simple Extérieur, Triple, Simple Intérieur */}
                {SECTORS.map((num, i) => {
                  const angleDeg = i * 18;
                  const startAngle = angleDeg - 9;
                  const endAngle = angleDeg + 9;
                  const isEven = i % 2 === 0;

                  const ringDoubleColor = isEven ? '#dc2626' : '#15803d'; // Rouge ou Vert
                  const ringTripleColor = isEven ? '#dc2626' : '#15803d'; // Rouge ou Vert
                  const singleBedColor = isEven ? '#18181b' : '#fef3c7'; // Noir ou Crème/Blanc

                  const pathDouble = describeArc(50, 50, 50 * RADII.DOUBLE_INNER, 50, startAngle, endAngle);
                  const pathOuterSingle = describeArc(50, 50, 50 * RADII.TRIPLE_OUTER, 50 * RADII.DOUBLE_INNER, startAngle, endAngle);
                  const pathTriple = describeArc(50, 50, 50 * RADII.TRIPLE_INNER, 50 * RADII.TRIPLE_OUTER, startAngle, endAngle);
                  const pathInnerSingle = describeArc(50, 50, 50 * RADII.SINGLE_BULL, 50 * RADII.TRIPLE_INNER, startAngle, endAngle);

                  return (
                    <g key={`sec-${num}`}>
                      <path d={pathDouble} fill={ringDoubleColor} />
                      <path d={pathOuterSingle} fill={singleBedColor} />
                      <path d={pathTriple} fill={ringTripleColor} />
                      <path d={pathInnerSingle} fill={singleBedColor} />
                    </g>
                  );
                })}

                {/* Simple Bull (25 - Vert) */}
                <circle cx="50" cy="50" r={50 * RADII.SINGLE_BULL} fill="#15803d" />
                {/* Double Bull Central (50 - Rouge) */}
                <circle cx="50" cy="50" r={50 * RADII.DOUBLE_BULL} fill="#dc2626" />
              </g>
            )}

            {/* DÉFINITIONS FILTRES CONTRASTE HAUTE VISIBILITÉ */}
            <defs>
              <filter id="wireShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="0.35" floodColor="#000000" floodOpacity="0.95" />
              </filter>
              <filter id="neon-glow-double" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="0.6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="neon-glow-triple" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="0.8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* GROUPE ARAIGNÉE AVEC TRANSPARENCE ÉQUILIBRÉE & CONTOUR HAUT CONTRASTE */}
            <g 
              opacity={isCalibrating ? Math.max(spiderOpacity, 0.78) : spiderOpacity} 
              filter="url(#wireShadow)"
              className="transition-opacity duration-200"
            >
              {/* Anneau Double Extérieur (Frontière de la cible) */}
              <circle
                cx="50"
                cy="50"
                r="50"
                fill="none"
                stroke={isCalibrating ? "#facc15" : "#34d399"}
                strokeWidth={isCalibrating ? "0.85" : "0.55"}
              />

              {/* Anneau Double Intérieur */}
              <circle
                cx="50"
                cy="50"
                r={50 * RADII.DOUBLE_INNER}
                fill="none"
                stroke={isCalibrating ? "#facc15" : "#10b981"}
                strokeWidth={isCalibrating ? "0.7" : "0.45"}
              />

              {/* Anneau Triple Extérieur */}
              <circle
                cx="50"
                cy="50"
                r={50 * RADII.TRIPLE_OUTER}
                fill="none"
                stroke={isCalibrating ? "#facc15" : "#34d399"}
                strokeWidth={isCalibrating ? "0.75" : "0.48"}
              />

              {/* Anneau Triple Intérieur */}
              <circle
                cx="50"
                cy="50"
                r={50 * RADII.TRIPLE_INNER}
                fill="none"
                stroke={isCalibrating ? "#facc15" : "#10b981"}
                strokeWidth={isCalibrating ? "0.7" : "0.45"}
              />

              {/* Simple Bull (25) */}
              <circle
                cx="50"
                cy="50"
                r={50 * RADII.SINGLE_BULL}
                fill={isCalibrating ? "rgba(250, 204, 21, 0.15)" : "rgba(16, 185, 129, 0.12)"}
                stroke={isCalibrating ? "#facc15" : "#34d399"}
                strokeWidth={isCalibrating ? "0.85" : "0.55"}
              />

              {/* Double Bull Central (50) */}
              <circle
                cx="50"
                cy="50"
                r={50 * RADII.DOUBLE_BULL}
                fill="#dc2626"
                stroke="#ffffff"
                strokeWidth="0.5"
              />

              {/* SEGMENTS DOUBLES ET TRIPLES ILLUMINÉS PENDANT LE CALIBRAGE */}
              {isCalibrating && (
                <g className="illuminated-calibration-segments select-none">
                  {SECTORS.map((num, i) => {
                    const isMatch = glowSector === 'all' || glowSector === String(num);
                    if (!isMatch) return null;

                    const angleDeg = i * 18;
                    const startAngle = angleDeg - 9;
                    const endAngle = angleDeg + 9;
                    const isFocus = glowSector === String(num);

                    const pathDouble = describeArc(50, 50, 50 * RADII.DOUBLE_INNER, 50, startAngle, endAngle);
                    const pathTriple = describeArc(50, 50, 50 * RADII.TRIPLE_INNER, 50 * RADII.TRIPLE_OUTER, startAngle, endAngle);

                    return (
                      <g key={`glow-seg-${num}`}>
                        {/* Double illuminé (Néon Cyan / Électrique) */}
                        <path
                          d={pathDouble}
                          fill={isFocus ? "rgba(56, 189, 248, 0.45)" : "rgba(56, 189, 248, 0.22)"}
                          stroke="#38bdf8"
                          strokeWidth={isFocus ? "1.0" : "0.6"}
                          filter="url(#neon-glow-double)"
                        />

                        {/* Triple illuminé (Néon Doré / Ambre éclatant) */}
                        <path
                          d={pathTriple}
                          fill={isFocus ? "rgba(250, 204, 21, 0.5)" : "rgba(250, 204, 21, 0.25)"}
                          stroke="#fde047"
                          strokeWidth={isFocus ? "1.1" : "0.65"}
                          filter="url(#neon-glow-triple)"
                        />
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Les 20 fils d'araignée radiaux nets séparant chaque segment */}
              {Array.from({ length: 20 }).map((_, i) => {
                const angleDeg = -99 + (i * 18);
                const angleRad = (angleDeg * Math.PI) / 180;
                const r1 = 50 * RADII.SINGLE_BULL;
                const r2 = 50;
                const x1 = 50 + r1 * Math.cos(angleRad);
                const y1 = 50 + r1 * Math.sin(angleRad);
                const x2 = 50 + r2 * Math.cos(angleRad);
                const y2 = 50 + r2 * Math.sin(angleRad);

                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isCalibrating ? "#facc15" : "#10b981"}
                    strokeWidth={isCalibrating ? "0.75" : "0.48"}
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Les 20 chiffres circulaires attachés à l'araignée */}
              {showNumbers && SECTORS.map((num, i) => {
                const deg = i * 18;
                const rad = ((deg - 90) * Math.PI) / 180;
                const cx = 50 + 55.5 * Math.cos(rad);
                const cy = 50 + 55.5 * Math.sin(rad);
                const isRed = i % 2 === 0;
                const rot = calibration.rotation || 0;

                return (
                  <g key={num} className="select-none" opacity={isCalibrating ? 0.92 : 0.78}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r="4.2"
                      fill={isRed ? "#dc2626" : "#2563eb"}
                      stroke="#ffffff"
                      strokeWidth="0.4"
                    />
                    <text
                      x={cx}
                      y={cy}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#ffffff"
                      fontSize="3.8"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                      transform={`rotate(${-rot} ${cx} ${cy})`}
                    >
                      {num}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {cameraActive && (
          <>
            {/* Last detected dart impact marker */}
            {lastDetectedDart && (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
                style={{
                  left: `${lastDetectedDart.x * 100}%`,
                  top: `${lastDetectedDart.y * 100}%`
                }}
              >
                <div className="relative">
                  <div className="w-5 h-5 rounded-full bg-emerald-400 animate-ping absolute -inset-0.5 opacity-75" />
                  <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center">
                    <span className="text-[8px] font-black text-slate-950">
                      {lastDetectedDart.multiplier > 1 ? `x${lastDetectedDart.multiplier}` : ''}
                    </span>
                  </div>
                  <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-slate-900/90 text-emerald-400 font-bold text-[10px] px-1.5 py-0.2 rounded shadow whitespace-nowrap border border-emerald-500/30">
                    {lastDetectedDart.label}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Top Floating Controls (Visible when camera is active) */}
      {cameraActive && (
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-20 pointer-events-auto">
          <div className="flex items-center gap-1.5">
            <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md flex items-center gap-1 shadow-md ${
              motionStatus === 'motion' ? 'bg-amber-500/90 text-white animate-pulse' :
              motionStatus === 'stabilizing' ? 'bg-blue-500/90 text-white' :
              motionStatus === 'detected' ? 'bg-emerald-500 text-white' :
              'bg-slate-900/80 text-slate-300'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                motionStatus === 'idle' ? 'bg-emerald-400' : 'bg-white'
              }`} />
              {motionStatus === 'motion' ? 'Mouvement...' :
               motionStatus === 'stabilizing' ? 'Analyse...' :
               motionStatus === 'detected' ? 'Flèche !' :
               (isMyTurn ? 'Prêt' : 'Attente')}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Resolution indicator button */}
            <button
              onClick={() => setIsCalibrating(true)}
              className="px-2 py-0.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-[10px] font-bold text-slate-300 border border-slate-700/60 backdrop-blur-md shadow flex items-center gap-1 cursor-pointer"
              title="Résolution de capture optique (800p, 1024p, 1600p)"
            >
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>{captureResolution}p</span>
            </button>

            {/* Quick Tutorial Access */}
            <button
              onClick={() => setShowTutorial(true)}
              className="p-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white backdrop-blur-md shadow transition-all active:scale-95 cursor-pointer"
              title="Guide & Tutoriel de positionnement"
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
            </button>

            {/* Unfreeze / Restart Camera stream button */}
            <button
              onClick={() => startCamera(facingMode, captureResolution)}
              className="p-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-emerald-400 border border-slate-700/60 backdrop-blur-md shadow transition-all active:scale-95 cursor-pointer"
              title="Défiger / Relancer le flux vidéo caméra"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={toggleFacingMode}
              className="p-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white backdrop-blur-md shadow transition-all active:scale-95 cursor-pointer"
              title="Basculer caméra avant / arrière"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsCalibrating(!isCalibrating)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md shadow transition-all flex items-center gap-1 active:scale-95 cursor-pointer ${
                isCalibrating ? 'bg-yellow-400 text-slate-950 font-black' : 'bg-slate-900/80 text-white hover:bg-slate-800'
              }`}
            >
              <Crosshair className="w-3 h-3" />
              {isCalibrating ? 'OK' : 'Calibrer'}
            </button>
          </div>
        </div>
      )}

      {/* Indicator on screen when calibrating with a specific glowing sector */}
      {isCalibrating && (
        <div className="absolute top-11 left-1/2 -translate-x-1/2 z-20 pointer-events-none bg-slate-950/85 border border-yellow-400/50 backdrop-blur-md px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black text-yellow-300 shadow-xl flex items-center gap-1.5 animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
          <span>Alignement : {glowSector === 'all' ? 'Tous les lits doubles & triples' : `Triple & Double ${glowSector}`}</span>
        </div>
      )}

      {/* Calibration Controls Panel (Fond en transparence à 80% pour voir la cible dessous) */}
      {isCalibrating && (
        <div className="absolute bottom-2 left-2 right-2 bg-slate-950/25 backdrop-blur-[3px] border border-yellow-500/60 rounded-xl p-2.5 z-30 shadow-2xl text-[11px] space-y-2">
          {/* Header du Calibrage */}
          <div className="flex items-center justify-between gap-1 text-yellow-300 font-black drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            <span className="flex items-center gap-1.5 truncate">
              <Crosshair className="w-3.5 h-3.5 text-yellow-400 shrink-0" /> 
              <span className="truncate">Calibrage de l'Araignée</span>
            </span>

            <div className="flex items-center gap-1 shrink-0">
              {/* Bouton Toggle Gabarit Cible Modèle */}
              <button
                type="button"
                onClick={() => setShowReferenceBoard(!showReferenceBoard)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition flex items-center gap-1 cursor-pointer ${
                  showReferenceBoard 
                    ? 'bg-emerald-950/80 border-emerald-400/50 text-emerald-300' 
                    : 'bg-slate-900/80 border-slate-700 text-slate-400'
                }`}
                title="Afficher/Masquer la cible modèle de référence pour aligner l'araignée"
              >
                <Target className="w-3 h-3" />
                <span>{showReferenceBoard ? 'Gabarit ON' : 'Gabarit OFF'}</span>
              </button>

              {/* Bouton Tutoriel */}
              <button
                type="button"
                onClick={() => setShowTutorial(true)}
                className="px-2 py-0.5 rounded text-[10px] font-bold border border-yellow-400/40 bg-slate-900/80 text-yellow-300 hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
                title="Ouvrir le guide et tutoriel de calibrage"
              >
                <HelpCircle className="w-3 h-3" />
                <span className="hidden xs:inline">Tutoriel</span>
              </button>

              <span className="text-[10px] text-yellow-300 bg-slate-950/70 border border-yellow-400/30 px-1.5 py-0.5 rounded font-mono">
                Rot: {calibration.rotation || 0}°
              </span>
            </div>
          </div>

          {/* ASSISTANCE IA AU CALIBRAGE */}
          <div className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between gap-1 text-[10px]">
            <div className="flex items-center gap-1.5 min-w-0">
              <Bot className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <div className="truncate">
                <span className="text-emerald-300 font-bold">IA Précision {aiFeedback.score}% : </span>
                <span className="text-slate-300">{aiFeedback.advice}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAiAutoCalibrate}
              disabled={isAiAutoTuning}
              className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1 shrink-0 transition active:scale-95 cursor-pointer shadow-sm"
              title="Ajustement et centrage automatique de la cible par l'IA"
            >
              <Wand2 className={`w-3 h-3 text-emerald-400 ${isAiAutoTuning ? 'animate-spin' : ''}`} />
              <span>{isAiAutoTuning ? 'Calcul IA...' : 'Auto-IA'}</span>
            </button>
          </div>

          {/* Sliders X & Y avec boutons de recentrage direct */}
          <div className="grid grid-cols-2 gap-2 text-white font-medium">
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[10px] text-white font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  Position X ({Math.round(calibration.cx * 100)}%)
                </label>
                <button
                  type="button"
                  onClick={() => saveCalibration({ ...calibration, cx: 0.5 })}
                  className="text-[9px] text-yellow-300 hover:text-white bg-slate-900/60 px-1 rounded border border-yellow-400/30 font-mono"
                  title="Recentrer X au point zéro (50%)"
                >
                  Centre
                </button>
              </div>
              <input
                type="range"
                min="0.2"
                max="0.8"
                step="0.01"
                value={calibration.cx}
                onChange={(e) => saveCalibration({ ...calibration, cx: parseFloat(e.target.value) })}
                className="w-full h-1 accent-yellow-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[10px] text-white font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  Position Y ({Math.round(calibration.cy * 100)}%)
                </label>
                <button
                  type="button"
                  onClick={() => saveCalibration({ ...calibration, cy: 0.5 })}
                  className="text-[9px] text-yellow-300 hover:text-white bg-slate-900/60 px-1 rounded border border-yellow-400/30 font-mono"
                  title="Recentrer Y au point zéro (50%)"
                >
                  Centre
                </button>
              </div>
              <input
                type="range"
                min="0.2"
                max="0.8"
                step="0.01"
                value={calibration.cy}
                onChange={(e) => saveCalibration({ ...calibration, cy: parseFloat(e.target.value) })}
                className="w-full h-1 accent-yellow-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Sliders Zoom & Rotation */}
          <div className="grid grid-cols-2 gap-2 text-white font-medium">
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[10px] text-white font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  Taille / Zoom
                </label>
                <button
                  type="button"
                  onClick={() => saveCalibration({ ...calibration, radius: 0.38 })}
                  className="text-[9px] text-yellow-300 hover:text-white bg-slate-900/60 px-1 rounded border border-yellow-400/30 font-mono"
                  title="Réinitialiser zoom standard"
                >
                  Défaut
                </button>
              </div>
              <input
                type="range"
                min="0.15"
                max="0.48"
                step="0.005"
                value={calibration.radius}
                onChange={(e) => saveCalibration({ ...calibration, radius: parseFloat(e.target.value) })}
                className="w-full h-1 accent-yellow-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[10px] text-white font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  Orientation Araignée
                </label>
                <button
                  type="button"
                  onClick={() => saveCalibration({ ...calibration, rotation: 0 })}
                  className="text-[9px] text-yellow-300 hover:text-white bg-slate-900/60 px-1 rounded border border-yellow-400/30 font-mono"
                  title="Réinitialiser orientation à 0°"
                >
                  0°
                </button>
              </div>
              <input
                type="range"
                min="-30"
                max="30"
                step="0.5"
                value={calibration.rotation || 0}
                onChange={(e) => saveCalibration({ ...calibration, rotation: parseFloat(e.target.value) })}
                className="w-full h-1 accent-yellow-400 cursor-pointer"
              />
            </div>
          </div>

          {/* SECTION : TRANSPARENCE DE L'ARAIGNÉE & VISIBILITÉ DU FILME */}
          <div className="p-1.5 rounded-lg bg-slate-950/60 border border-yellow-500/30 space-y-1 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-yellow-300 font-bold flex items-center gap-1">
                <Eye className="w-3 h-3 text-yellow-400" />
                <span>Transparence Araignée ({Math.round(spiderOpacity * 100)}%)</span>
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowNumbers(!showNumbers)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition cursor-pointer ${
                    showNumbers 
                      ? 'bg-slate-900 border-slate-700 text-slate-300' 
                      : 'bg-amber-500/20 border-amber-400 text-amber-300'
                  }`}
                  title="Afficher ou masquer les 20 chiffres autour de la cible pour mieux voir le fil métallique"
                >
                  {showNumbers ? 'Chiffres ON' : 'Chiffres OFF'}
                </button>

                {[0.4, 0.65, 0.8, 1.0].map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => {
                      setSpiderOpacity(op);
                      localStorage.setItem('dartsma_spider_opacity', String(op));
                    }}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition cursor-pointer ${
                      Math.abs(spiderOpacity - op) < 0.08
                        ? 'bg-yellow-400 text-slate-950 border-yellow-300 font-black'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {Math.round(op * 100)}%
                  </button>
                ))}
              </div>
            </div>

            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={spiderOpacity}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setSpiderOpacity(val);
                localStorage.setItem('dartsma_spider_opacity', String(val));
              }}
              className="w-full h-1 accent-yellow-400 cursor-pointer"
            />
          </div>

          {/* SECTION : SEGMENTS ILLUMINÉS & ALIGNEMENT PRÉCIS */}
          <div className="p-1.5 rounded-lg bg-slate-950/60 border border-yellow-500/30 flex items-center justify-between gap-1 text-[10px]">
            <span className="text-yellow-300 font-bold flex items-center gap-1 shrink-0">
              <Sparkles className="w-3 h-3 text-yellow-400" />
              <span>Segments illuminés :</span>
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => cycleGlowSector(-1)}
                className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer"
                title="Secteur précédent"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={() => setGlowSector(glowSector === '20' ? 'all' : '20')}
                className={`px-2 py-0.5 rounded font-black border transition cursor-pointer ${
                  glowSector !== 'all' 
                    ? 'bg-amber-500 text-slate-950 border-amber-400' 
                    : 'bg-slate-900 text-slate-300 border-slate-700'
                }`}
                title="Cibler le segment T20/D20 en surbrillance"
              >
                {glowSector === 'all' ? 'Tous' : `Secteur ${glowSector}`}
              </button>

              <button
                type="button"
                onClick={() => cycleGlowSector(1)}
                className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer"
                title="Secteur suivant"
              >
                <ChevronRight className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={() => setGlowSector(glowSector === 'all' ? '20' : 'all')}
                className={`px-1.5 py-0.5 rounded font-bold border transition text-[9px] cursor-pointer ${
                  glowSector === 'all'
                    ? 'bg-sky-500 text-slate-950 border-sky-400'
                    : 'bg-slate-900 text-slate-400 border-slate-700'
                }`}
              >
                {glowSector === 'all' ? 'Tous ON' : 'Tout voir'}
              </button>
            </div>
          </div>

          {/* SECTION : QUALITÉ DE CAPTURE (800 / 1024 / 1600 PIXELS) */}
          <div className="p-1.5 rounded-lg bg-slate-950/60 border border-yellow-500/30 flex items-center justify-between gap-1 text-[10px]">
            <span className="text-emerald-300 font-bold flex items-center gap-1 shrink-0">
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>Qualité Capture :</span>
            </span>

            <div className="flex items-center gap-1">
              {[800, 1024, 1600].map((res) => (
                <button
                  key={res}
                  type="button"
                  onClick={() => handleResolutionChange(res)}
                  className={`px-2 py-0.5 rounded font-bold border transition text-[9px] cursor-pointer ${
                    captureResolution === res
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                  title={`Passer la résolution de capture à ${res}x${res} pixels`}
                >
                  {res}px
                </button>
              ))}
            </div>
          </div>

          {/* Boutons d'Action : Point Zéro (Recentrer tout) & Validation */}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={handleResetZero}
              className="px-2.5 py-1.5 bg-slate-900/85 hover:bg-slate-800 text-yellow-300 border border-yellow-400/40 font-bold text-[10px] rounded-lg transition active:scale-95 shadow flex items-center gap-1 cursor-pointer shrink-0"
              title="Recentrer tous les paramètres de calibrage au point zéro (Centre 50%, Rotation 0°, Zoom standard)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-yellow-400" />
              <span>Point Zéro</span>
            </button>
            <button
              onClick={() => setIsCalibrating(false)}
              className="flex-1 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs rounded-lg transition-all shadow-lg active:scale-95 cursor-pointer text-center"
            >
              Valider le calibrage de l'araignée
            </button>
          </div>
        </div>
      )}

      {/* Tutorial Modal */}
      <CameraTutorialModal
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
      />

      {/* Contrôle Caméra Inactive (Flottant en bas pour laisser l'araignée 100% visible sans gêne) */}
      {!cameraActive && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex flex-col items-center gap-1.5 p-2 sm:p-2.5 bg-slate-950/85 backdrop-blur-md rounded-2xl border border-emerald-500/40 shadow-2xl max-w-[92%] w-auto">
          {cameraError && (
            <div className="bg-rose-950/80 border border-rose-500/50 text-rose-300 text-[10px] p-2 rounded-xl text-center flex flex-col items-center gap-1 max-w-sm">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>Autorisation Caméra Requise</span>
              </div>
              <p className="text-[10px] text-slate-300 leading-tight">
                {cameraError}
              </p>
            </div>
          )}

          <div className="flex items-center gap-1.5 w-full justify-center">
            {isHttpsRequired ? (
              <button
                type="button"
                onClick={switchToHttps}
                className="py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition-all shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Ouvrir en HTTPS Sécurisé (Requis Caméra)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="py-2.5 px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black transition-all shadow-lg shadow-emerald-500/25 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isStartingCamera ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Activation en cours... (Touchez pour forcer)</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>Activer la Caméra</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={toggleFacingMode}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
              title="Basculer entre la caméra arrière et la caméra avant"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>{facingMode === 'environment' ? 'Arrière' : 'Avant'}</span>
            </button>
          </div>

          <p className="text-[9px] text-slate-400 text-center">
            💡 Astuce Hotwav / Tablette : si une invite apparaît en haut de l'écran, appuyez sur <strong>« Autoriser »</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
