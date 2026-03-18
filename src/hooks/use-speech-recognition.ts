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
  const shouldBeListeningRef = useRef(false);

  // Keep refs fresh to avoid stale closures
  onResultRef.current = onResult;
  onInterimRef.current = onInterim;
  onEndRef.current = onEnd;

  const start = useCallback(() => {
    if (!isSupported) return;

    shouldBeListeningRef.current = true;

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
      if (e.error === "no-speech") return;
      if (e.error === "aborted") return;
      setIsListening(false);
      shouldBeListeningRef.current = false;
    };

    recognition.onend = () => {
      if (shouldBeListeningRef.current) {
        // Auto-restart after a brief delay to prevent silent drops
        setTimeout(() => {
          if (shouldBeListeningRef.current) {
            try {
              recognition.start();
            } catch {
              setIsListening(false);
              onEndRef.current?.();
            }
          }
        }, 300);
      } else {
        setIsListening(false);
        onEndRef.current?.();
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, lang, continuous]);

  const stop = useCallback(() => {
    shouldBeListeningRef.current = false;
    recognitionRef.current?.stop();
  }, []);

  return { isListening, transcript, isSupported, start, stop };
}
