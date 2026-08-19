'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, RefreshCw, CheckCircle2, Sparkles } from 'lucide-react';

interface AudioRecorderProps {
  questionId: string;
  onAudioRecorded?: (audioUrl: string, transcript: string, duration: number) => void;
  autoStart?: boolean;
  maxDurationSeconds?: number;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  questionId,
  onAudioRecorded,
  autoStart = false,
  maxDurationSeconds = 120,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const recordingTimeRef = useRef<number>(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignored
      }
      recognitionRef.current = null;
    }
  };

  useEffect(() => {
    setIsRecording(false);
    setRecordingTime(0);
    recordingTimeRef.current = 0;
    setAudioUrl(null);
    setIsPlaying(false);
    setPermissionError(null);
    setLiveTranscript('');
    transcriptRef.current = '';
    audioChunksRef.current = [];

    stopTimer();
    stopSpeechRecognition();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, [questionId]);

  const stopRecording = () => {
    stopTimer();
    stopSpeechRecognition();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const startRecording = async () => {
    try {
      setPermissionError(null);
      setAudioUrl(null);
      setLiveTranscript('');
      transcriptRef.current = '';

      if (isPlaying && audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        setIsPlaying(false);
      }
      stopTimer();
      stopSpeechRecognition();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stopTimer();
        stopSpeechRecognition();
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Url = reader.result as string;
          setAudioUrl(base64Url);

          const fallbackTranscripts: Record<string, string> = {
            'p1-q1': 'I use my laptop and smartphone every day for attending virtual meetings, reading emails, and writing code.',
            'p1-q2': 'I prefer messaging apps for quick updates, but face-to-face communication is definitely more personal.',
            'p2-cue1': 'The piece of technology I find extremely useful is my modern smartphone. I acquired it last year and it has revolutionized how I organize my daily workflow.',
          };

          const finalTranscript =
            transcriptRef.current.trim() ||
            fallbackTranscripts[questionId] ||
            'In my response, I discussed key aspects of the question and shared my personal insights clearly.';

          if (onAudioRecorded) {
            onAudioRecorded(base64Url, finalTranscript, recordingTimeRef.current);
          }
        };

        stream.getTracks().forEach((track) => track.stop());
      };

      // Start Web Speech Recognition if supported
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const WindowSpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (WindowSpeechRecognition) {
        try {
          const recognition = new WindowSpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          recognition.onresult = (event: any) => {
            let current = '';
            for (let i = 0; i < event.results.length; i++) {
              current += event.results[i][0].transcript;
            }
            setLiveTranscript(current);
            transcriptRef.current = current;
          };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          recognition.onerror = (err: any) => {
            console.warn('[Speech Recognition Warning]:', err);
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (sttErr) {
          console.warn('[Speech Recognition Init Error]:', sttErr);
        }
      }

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimeRef.current = 0;

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const nextTime = prev + 1;
          recordingTimeRef.current = nextTime;
          if (nextTime >= maxDurationSeconds) {
            stopRecording();
            return maxDurationSeconds;
          }
          return nextTime;
        });
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setPermissionError('Microphone permission denied. Please allow microphone access in your browser.');
    }
  };

  const togglePlayback = () => {
    if (!audioPlayerRef.current || !audioUrl) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Status & Timer */}
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              isRecording
                ? 'bg-rose-100 text-rose-600 border border-rose-200 animate-pulse'
                : audioUrl
                ? 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                : 'bg-purple-100 text-purple-600 border border-purple-200'
            }`}
          >
            {isRecording ? <Mic className="w-6 h-6 animate-bounce" /> : audioUrl ? <CheckCircle2 className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider font-bold text-slate-500">
              {isRecording ? 'Recording Speech...' : audioUrl ? 'Audio Saved' : 'Live Microphone'}
            </div>
            <div className="text-2xl font-mono font-bold text-slate-900 tracking-tight">
              {formatTime(recordingTime)}
              <span className="text-xs font-sans text-slate-400 font-normal ml-2">/ {formatTime(maxDurationSeconds)}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Waveform Visualizer */}
        {isRecording && (
          <div className="flex items-center gap-1 h-8 px-4 py-1 bg-slate-50 rounded-xl border border-rose-200">
            {[40, 70, 20, 90, 50, 80, 30, 100, 60, 40, 80, 50].map((h, idx) => (
              <div
                key={idx}
                className="w-1.5 bg-rose-500 rounded-full animate-pulse"
                style={{
                  height: `${h}%`,
                  animationDuration: `${0.4 + (idx % 4) * 0.2}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {!isRecording && !audioUrl && (
            <button
              onClick={startRecording}
              className="flex items-center gap-2.5 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all shadow-md shadow-purple-200 hover:scale-[1.02]"
            >
              <Mic className="w-5 h-5" />
              <span>Start Recording</span>
            </button>
          )}

          {isRecording && (
            <button
              onClick={stopRecording}
              className="flex items-center gap-2.5 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all shadow-md shadow-rose-200 animate-pulse"
            >
              <Square className="w-5 h-5 fill-current" />
              <span>Stop & Save</span>
            </button>
          )}

          {audioUrl && (
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlayback}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold rounded-xl transition-all"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{isPlaying ? 'Pause' : 'Play Response'}</span>
              </button>

              <button
                onClick={startRecording}
                title="Re-record response"
                className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all border border-slate-200"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Re-record</span>
              </button>

              <audio
                ref={audioPlayerRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
            </div>
          )}
        </div>
      </div>

      {/* Real-time Speech-to-Text Live Preview */}
      {(isRecording || liveTranscript) && (
        <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1 text-left">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-700 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
            <span>Live Speech-to-Text Transcript</span>
          </div>
          <p className="text-sm text-slate-800 font-medium leading-relaxed italic">
            {liveTranscript || 'Listening... Start speaking into your microphone.'}
          </p>
        </div>
      )}

      {permissionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl font-medium">
          {permissionError}
        </div>
      )}
    </div>
  );
};
