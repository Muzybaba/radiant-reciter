import { Mic, Square } from "lucide-react";
import { motion } from "framer-motion";

interface MicButtonProps {
  isListening: boolean;
  onToggle: () => void;
}

const MicButton = ({ isListening, onToggle }: MicButtonProps) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
      <motion.button
        onClick={onToggle}
        whileTap={{ scale: 0.94 }}
        className={`relative flex items-center justify-center w-16 h-16 rounded-full shadow-lg transition-colors duration-300 ${
          isListening
            ? "bg-primary text-primary-foreground"
            : "bg-foreground text-background hover:bg-foreground/90"
        }`}
        aria-label={isListening ? "Stop reciting" : "Start reciting"}
      >
        {isListening ? <Square size={22} fill="currentColor" /> : <Mic size={24} />}
        {isListening && (
          <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
        )}
      </motion.button>
    </div>
  );
};

export default MicButton;
