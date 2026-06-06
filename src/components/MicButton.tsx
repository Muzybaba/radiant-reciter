import { Mic, Square } from "lucide-react";
import { motion } from "framer-motion";

interface MicButtonProps {
  isListening: boolean;
  onToggle: () => void;
}

const MicButton = ({ isListening, onToggle }: MicButtonProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      <div className="h-48 bg-gradient-to-t from-background via-background/90 to-transparent flex flex-col items-end justify-end pb-10 pr-0">
        <div className="w-full flex flex-col items-center gap-5 pointer-events-auto">
          <p
            className={`label-ui transition-opacity duration-500 ${
              isListening ? "opacity-100 animate-pulse text-primary/80" : "opacity-40"
            }`}
          >
            {isListening ? "Listening for recitation…" : "Press to begin"}
          </p>
          <motion.button
            onClick={onToggle}
            whileTap={{ scale: 0.94 }}
            whileHover={{ scale: 1.04 }}
            transition={{ duration: 0.3 }}
            className="relative group"
            aria-label={isListening ? "Stop reciting" : "Start reciting"}
          >
            {/* Outer pulse aura */}
            <span
              className={`absolute inset-0 rounded-full blur-2xl transition-opacity duration-700 ${
                isListening ? "opacity-60 animate-pulse" : "opacity-20"
              }`}
              style={{ background: "hsl(var(--primary))" }}
            />
            {/* Ring */}
            <span
              className={`relative flex items-center justify-center w-20 h-20 rounded-full border bg-background text-primary transition-all duration-500 ${
                isListening
                  ? "border-primary shadow-[0_0_40px_hsl(var(--primary)/0.45)]"
                  : "border-primary/40 shadow-[var(--shadow-gold)]"
              }`}
            >
              {isListening ? (
                <Square size={22} fill="currentColor" />
              ) : (
                <Mic size={26} />
              )}
              {isListening && (
                <span className="absolute inset-0 rounded-full border border-primary/40 animate-ping" />
              )}
            </span>
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default MicButton;
