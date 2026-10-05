import { motion } from 'motion/react';
import { Wallet } from 'lucide-react';

export default function Splash() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-b from-surface-container-lowest via-primary-fixed to-surface-container-low overflow-hidden">
      {/* Animated Background Orbs */}
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.3 }}
        transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
        className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-fixed-dim rounded-full blur-[100px]"
      />
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.2 }}
        transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse", delay: 0.5 }}
        className="absolute bottom-[5%] right-[-10%] w-80 h-80 bg-secondary-fixed rounded-full blur-[80px]"
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center z-10"
      >
        <div className="w-24 h-24 md:w-32 md:h-32 rounded-[28%] liquid-glass border border-white/60 flex items-center justify-center shadow-2xl shadow-primary/20 transform rotate-[12deg] mb-6">
          <div className="transform -rotate-[12deg]">
            <Wallet className="w-12 h-12 md:w-16 md:h-16 text-primary" />
          </div>
        </div>
        
        <h1 className="text-4xl font-bold text-primary tracking-tighter mb-1">SpendWise</h1>
        <p className="text-[10px] uppercase tracking-[0.2em] text-outline opacity-60">Financial Serenity</p>
      </motion.div>

      <div className="absolute bottom-16 flex flex-col items-center">
        <div className="w-8 h-[2px] bg-outline-variant rounded-full overflow-hidden">
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="h-full bg-primary w-1/2 rounded-full"
          />
        </div>
      </div>
    </div>
  );
}
