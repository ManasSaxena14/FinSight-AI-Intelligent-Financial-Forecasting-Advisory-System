import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Mic, Square } from 'lucide-react';
import { advisorService, apiError } from '../../api/aiService';
import { cn } from '../../lib/cn';

const MAX_SECONDS = 60;

/** Hold-free voice input: tap to record, tap to stop; the transcript goes to onText. */
export default function VoiceButton({ onText, language, className, size = 'h-9 w-9' }) {
  const [state, setState] = useState('idle'); // idle | recording | working
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef(null);
  const timerRef = useRef(null);
  const supported = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof window.MediaRecorder !== 'undefined';

  useEffect(() => () => {
    clearInterval(timerRef.current);
    recorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
  }, []);

  const stop = () => {
    clearInterval(timerRef.current);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  const start = async () => {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error('Microphone access was blocked');
      return;
    }
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported?.(m));
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      if (blob.size < 1200) { setState('idle'); return; }
      setState('working');
      try {
        const { text } = await advisorService.transcribe(blob, language === 'hi' ? 'hi' : language === 'en' ? 'en' : undefined);
        if (text) onText(text);
        else toast('Didn’t catch that — try again');
      } catch (err) {
        toast.error(apiError(err, 'Voice input failed'));
      } finally {
        setState('idle');
      }
    };
    recorderRef.current = recorder;
    recorder.start();
    setSeconds(0);
    setState('recording');
    timerRef.current = setInterval(() => setSeconds((s) => {
      if (s + 1 >= MAX_SECONDS) stop();
      return s + 1;
    }), 1000);
  };

  if (!supported) return null;
  return (
    <button type="button" onClick={state === 'recording' ? stop : start} disabled={state === 'working'}
      title={state === 'recording' ? 'Stop recording' : 'Speak (English, Hindi or Hinglish)'}
      aria-label={state === 'recording' ? 'Stop recording' : 'Voice input'}
      className={cn('relative grid shrink-0 place-items-center rounded-xl transition', size,
        state === 'recording' ? 'bg-neg/15 text-neg' : 'text-fg-faint hover:bg-white/[0.05] hover:text-fg', className)}>
      {state === 'recording' && <span className="absolute inset-0 animate-ping rounded-xl bg-neg/20" />}
      {state === 'working' ? <Loader2 className="h-4 w-4 animate-spin" /> : state === 'recording' ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-4 w-4" />}
      {state === 'recording' && <span className="num absolute -top-2 right-0 rounded bg-neg px-1 text-[9px] text-white">{seconds}s</span>}
    </button>
  );
}
