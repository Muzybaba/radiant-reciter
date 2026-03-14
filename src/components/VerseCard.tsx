import { motion } from "framer-motion";
import { Mic, MicOff, Check, X } from "lucide-react";
import { useState, useCallback } from "react";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { compareTexts } from "@/lib/arabic-compare";

interface VerseCardProps {
  number: number;
  text: string;
  isMistake: boolean;
  onTap: () => void;
  onAutoDetect?: (isMistake: boolean) => void;
}

type RecitationResult = "correct" | "mistake" | null;

const VerseCard = ({ number, text, isMistake, onTap, onAutoDetect }: VerseCardProps) => {
  const [result, setResult] = useState<RecitationResult>(null);
  const [showResult, setShowResult] = useState(false);

  const handleResult = useCallback(
    (transcript: string) => {
      const score = compareTexts(transcript, text);
      const detected: RecitationResult = score >= 0.5 ? "correct" : "mistake";
      setResult(detected);
      setShowResult(true);

      if (detected === "mistake") {
        onAutoDetect?.(true);
      }

      setTimeout(() => setShowResult(false), 3000);
    },
    [text, onAutoDetect]
  );

  const { isListening, isSupported, start, stop } = useSpeechRecognition({
    lang: "ar",
    onResult: handleResult,
  });

  const handleMicClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isListening) {
      stop();
    } else {
      setResult(null);
      start();
    }
  };

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      className={`w-full text-right rounded-sm p-6 transition-colors duration-200 border group relative
        ${
          isMistake
            ? "bg-mistake-bg border-mistake-border"
            : result === "correct" && showResult
            ? "bg-green-50 border-green-200"
            : "bg-transparent border-transparent hover:bg-accent hover:border-border"
        }`}
      dir="rtl"
    >
      <div className="flex items-start gap-4">
        <span
          className={`label-ui mt-3 shrink-0 tabular-nums ${
            isMistake ? "text-mistake-text" : ""
          }`}
        >
          {number}
        </span>
        <button onClick={onTap} className="font-arabic text-4xl leading-[2.5] flex-1 text-right">
          <p className={isMistake ? "text-mistake-text" : "text-foreground"}>
            {text}
          </p>
        </button>

        {/* Mic button & result indicator */}
        <div className="flex items-center gap-2 mt-3 shrink-0">
          {showResult && result && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`rounded-full p-1 ${
                result === "correct"
                  ? "bg-green-100 text-green-700"
                  : "bg-mistake-bg text-mistake-text"
              }`}
            >
              {result === "correct" ? <Check size={14} /> : <X size={14} />}
            </motion.span>
          )}

          {isSupported && (
            <button
              onClick={handleMicClick}
              className={`rounded-full p-2 transition-colors ${
                isListening
                  ? "bg-primary text-primary-foreground animate-pulse"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
              title={isListening ? "Stop recording" : "Start reciting"}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default VerseCard;
