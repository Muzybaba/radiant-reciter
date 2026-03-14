import { motion } from "framer-motion";

interface VerseCardProps {
  number: number;
  text: string;
  isMistake: boolean;
  onTap: () => void;
}

const VerseCard = ({ number, text, isMistake, onTap }: VerseCardProps) => {
  return (
    <motion.button
      onClick={onTap}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      className={`w-full text-right rounded-sm p-6 transition-colors duration-200 border group
        ${
          isMistake
            ? "bg-mistake-bg border-mistake-border"
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
        <p
          className={`font-arabic text-4xl leading-[2.5] flex-1 ${
            isMistake ? "text-mistake-text" : "text-foreground"
          }`}
        >
          {text}
        </p>
      </div>
    </motion.button>
  );
};

export default VerseCard;
