import { motion } from "framer-motion";

type VerseStatus = "default" | "active" | "mistake" | "success";

interface VerseCardProps {
  number: number;
  text: string;
  status: VerseStatus;
  onTap: () => void;
}

const statusStyles: Record<VerseStatus, string> = {
  default: "bg-transparent border-transparent hover:bg-accent hover:border-border",
  active: "bg-white dark:bg-white/10 border-primary/30 shadow-md",
  mistake: "bg-[hsl(var(--mistake-bg))] border-[hsl(var(--mistake-border))]",
  success: "bg-[hsl(var(--success-bg))] border-[hsl(var(--success-border))]",
};

const textStyles: Record<VerseStatus, string> = {
  default: "text-foreground",
  active: "text-foreground",
  mistake: "text-[hsl(var(--mistake-text))]",
  success: "text-[hsl(var(--success-text))]",
};

const numberStyles: Record<VerseStatus, string> = {
  default: "",
  active: "text-primary",
  mistake: "text-[hsl(var(--mistake-text))]",
  success: "text-[hsl(var(--success-text))]",
};

const VerseCard = ({ number, text, status, onTap }: VerseCardProps) => {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
      className={`w-full text-right rounded-sm p-6 transition-colors duration-200 border group relative ${statusStyles[status]}`}
      dir="rtl"
    >
      <div className="flex items-start gap-4">
        <span className={`label-ui mt-3 shrink-0 tabular-nums ${numberStyles[status]}`}>
          {number}
        </span>
        <button onClick={onTap} className="font-arabic text-4xl leading-[2.5] flex-1 text-right">
          <p className={textStyles[status]}>{text}</p>
        </button>
      </div>
    </motion.div>
  );
};

export default VerseCard;
