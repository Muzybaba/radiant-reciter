import { useState, useCallback, useRef } from "react";

interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  onResult?: (transcript: string) => void;
  onInterim?: (transcript: string) => void;
  onEnd?: () => void;
}

export function useSpeechRecognition({
  lang = "ar",
  continuous = false,
  onResult,
  onInterim,
  onEnd,
}: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const isSupported =
    typeof window !== "undefined" &&
    ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);
  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef(onResult);
  const onInterimRef = useRef(onInterim);
  const onEndRef = useRef(onEnd);

  // Keep refs fresh to avoid stale closures
  onResultRef.current = onResult;
  onInterimRef.current = onInterim;
  onEndRef.current = onEnd;

  const start = useCallback(() => {
    if (!isSupported) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        const segment = finalTranscript.trim();
        setTranscript(segment);
        onResultRef.current?.(segment);
      }

      if (interimTranscript) {
        onInterimRef.current?.(interimTranscript.trim());
      }
    };

    recognition.onerror = (e: any) => {
      // Don't stop on no-speech errors, just keep listening
      if (e.error === "no-speech") return;
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      onEndRef.current?.();
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, lang, continuous]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return { isListening, transcript, isSupported, start, stop };
}
