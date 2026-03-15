import { motion } from "framer-motion";

interface VerseCardProps {
  number: number;
  text: string;
  isMistake: boolean;
  isActive: boolean;
  onTap: () => void;
}

const VerseCard = ({ number, text, isMistake, isActive, onTap }: VerseCardProps) => {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      className={`w-full text-right rounded-sm p-6 transition-colors duration-200 border group relative
        ${
          isMistake
            ? "bg-mistake-bg border-mistake-border"
            : isActive
            ? "bg-primary/5 border-primary/20"
            : "bg-transparent border-transparent hover:bg-accent hover:border-border"
        }`}
      dir="rtl"
    >
      <div className="flex items-start gap-4">
        <span
          className={`label-ui mt-3 shrink-0 tabular-nums ${
            isMistake ? "text-mistake-text" : isActive ? "text-primary" : ""
          }`}
        >
          {number}
        </span>
        <button onClick={onTap} className="font-arabic text-4xl leading-[2.5] flex-1 text-right">
          <p className={isMistake ? "text-mistake-text" : "text-foreground"}>
            {text}
          </p>
        </button>
      </div>
    </motion.div>
  );
};

export default VerseCard;
