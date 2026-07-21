"use client";

import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { ArrowUp, Mic, Square } from "lucide-react";

const SILENCE_AUTO_SUBMIT_MS = 1500;

export function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (value: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");
  const [listening, setListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef(""); // avoids stale closures inside the recognition callbacks

  const clearSilenceTimer = () => {
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    silenceTimer.current = null;
  };

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    setMicSupported(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join("");
      setValue(transcript);
      valueRef.current = transcript;

      // Auto-submit once the user stops talking for a beat, instead of
      // requiring a manual stop click.
      clearSilenceTimer();
      silenceTimer.current = setTimeout(() => {
        recognitionRef.current?.stop();
      }, SILENCE_AUTO_SUBMIT_MS);
    };
    recognition.onend = () => {
      setListening(false);
      clearSilenceTimer();
      const finalTranscript = valueRef.current.trim();
      if (finalTranscript) {
        onSend(finalTranscript);
        setValue("");
        valueRef.current = "";
      }
    };
    recognition.onerror = () => {
      setListening(false);
      clearSilenceTimer();
    };

    recognitionRef.current = recognition;
    return () => {
      clearSilenceTimer();
      recognition.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMic = () => {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      setValue("");
      valueRef.current = "";
      recognitionRef.current.start();
      setListening(true);
    }
  };

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex items-end gap-1.5 rounded-2xl border border-border bg-surface p-1.5 shadow-lg shadow-black/20 focus-within:border-accent/40 sm:gap-2 sm:p-2">
      {/* {micSupported && (
        <button
          onClick={toggleMic}
          aria-label={listening ? "Stop recording" : "Start voice input"}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
            listening ? "animate-pulse bg-accent text-base" : "text-muted hover:bg-surface2 hover:text-primary"
          }`}
        >
          {listening ? <Square size={15} /> : <Mic size={16} />}
        </button>
      )} */}
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          valueRef.current = e.target.value;
        }}
        onKeyDown={handleKeyDown}
        placeholder={listening ? "Listening... (auto-sends after a pause)" : "Ask about anything from the course..."}
        rows={1}
        className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-primary placeholder:text-muted focus:outline-none"
      />
      <button
        onClick={submit}
        disabled={disabled || !value.trim()}
        aria-label="Send question"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-base transition-opacity disabled:opacity-40"
      >
        <ArrowUp size={16} />
      </button>
    </div>
  );
}