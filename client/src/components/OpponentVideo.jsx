import React, { useEffect, useRef, useState } from 'react';
import { Video, VideoOff, Volume2, VolumeX, Radio } from 'lucide-react';

export default function OpponentVideo({ socket, roomId, myId, opponentName }) {
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (!socket || !roomId) return;

    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const pc = new RTCPeerConnection(configuration);
    pcRef.current = pc;

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setHasRemoteStream(true);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc:signal', {
          roomId,
          signal: { type: 'candidate', candidate: event.candidate }
        });
      }
    };

    // Handle incoming WebRTC signals
    const handleSignal = async ({ senderId, signal }) => {
      if (senderId === myId) return;

      try {
        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('webrtc:signal', {
            roomId,
            signal: { type: 'answer', sdp: answer }
          });
        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        } else if (signal.type === 'candidate') {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
        }
      } catch (err) {
        console.warn('WebRTC signal handling error:', err);
      }
    };

    socket.on('webrtc:signal', handleSignal);

    // Initial offer sender if user initiates
    const initiateCall = async () => {
      try {
        // Try getting local stream to send to opponent
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(() => null);
        if (stream) {
          stream.getTracks().forEach(track => pc.addTrack(track, stream));
        }

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc:signal', {
          roomId,
          signal: { type: 'offer', sdp: offer }
        });
      } catch (e) {
        console.warn('WebRTC initiation failed:', e);
      }
    };

    initiateCall();

    return () => {
      socket.off('webrtc:signal', handleSignal);
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, [socket, roomId, myId]);

  const toggleMute = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center justify-center border border-slate-800">
      {/* Remote Video Stream */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className={`w-full h-full object-cover transition-opacity duration-300 ${hasRemoteStream ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Opponent Info Badge */}
      <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
        <div className="bg-slate-900/85 backdrop-blur-md px-3 py-1 rounded-full border border-slate-700/80 flex items-center gap-2 shadow">
          <div className="flex items-center gap-1.5 text-rose-500">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span className="text-[10px] font-black tracking-wider uppercase">CIBLE ADVERSE</span>
          </div>
          <span className="text-xs font-bold text-slate-200">
            {opponentName || 'Adversaire'}
          </span>
        </div>
      </div>

      {/* Audio controls */}
      {hasRemoteStream && (
        <button
          onClick={toggleMute}
          className="absolute top-3 right-3 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-200 backdrop-blur-md z-10 transition"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      )}

      {/* Placeholder when opponent camera is not connected */}
      {!hasRemoteStream && (
        <div className="text-center p-6 text-slate-400 flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center border border-slate-700">
            <Video className="w-8 h-8 text-slate-500 animate-pulse" />
          </div>
          <p className="text-xs text-slate-400 font-medium">
            En attente du flux vidéo de <span className="text-slate-200 font-bold">{opponentName}</span>...
          </p>
          <span className="text-[11px] text-slate-500">Le score reste 100% synchronisé en direct.</span>
        </div>
      )}
    </div>
  );
}

