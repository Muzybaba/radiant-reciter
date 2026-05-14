import { useCallback, useRef, useState } from "react";
import { useScribe } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";

interface UseScribeRecognitionOptions {
  language?: string; // ISO 639-3, e.g. "ara"
  onResult?: (transcript: string) => void;
  onInterim?: (transcript: string) => void;
  onEnd?: () => void;
  onError?: (msg: string) => void;
}

/**
 * ElevenLabs Scribe v2 Realtime — drop-in replacement for the browser
 * Web Speech hook. Mirrors the same surface: { isListening, transcript,
 * isSupported, start, stop, reset }. Emits cumulative transcripts so the
 * existing matching logic in Index.tsx works unchanged.
 */
export function useScribeRecognition({
  language = "ara",
  onResult,
  onInterim,
  onEnd,
  onError,
}: UseScribeRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  const onResultRef = useRef(onResult);
  const onInterimRef = useRef(onInterim);
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);
  onResultRef.current = onResult;
  onInterimRef.current = onInterim;
  onEndRef.current = onEnd;
  onErrorRef.current = onError;

  // Cumulative committed text + current partial appended on top
  const committedRef = useRef<string>("");

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: "vad",
    language,
    onPartialTranscript: (data: { text: string }) => {
      const text = (data?.text || "").trim();
      const combined = committedRef.current
        ? text
          ? `${committedRef.current} ${text}`
          : committedRef.current
        : text;
      onInterimRef.current?.(combined);
    },
    onCommittedTranscript: (data: { text: string }) => {
      const text = (data?.text || "").trim();
      if (!text) return;
      committedRef.current = committedRef.current
        ? `${committedRef.current} ${text}`
        : text;
      setTranscript(committedRef.current);
      onResultRef.current?.(committedRef.current);
    },
  });

  const isSupported = typeof window !== "undefined" && "WebSocket" in window;

  const reset = useCallback(() => {
    committedRef.current = "";
    setTranscript("");
  }, []);

  const start = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("scribe-token");
      if (error) throw error;
      if (!data?.token) throw new Error("No realtime token returned");

      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      setIsListening(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to start recognition";
      onErrorRef.current?.(msg);
      setIsListening(false);
      // eslint-disable-next-line no-console
      console.error("Scribe start failed:", msg);
    }
  }, [scribe]);

  const stop = useCallback(() => {
    try {
      scribe.disconnect();
    } catch {
      // ignore
    }
    setIsListening(false);
    onEndRef.current?.();
  }, [scribe]);

  return { isListening, transcript, isSupported, start, stop, reset };
}
