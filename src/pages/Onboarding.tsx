import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Car, ShoppingBag, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';

const slides = [
  {
    title: "Track with Ease",
    description: "Effortlessly log every expense with a single tap. Clarity in your palm.",
    icon: <ShoppingBag className="w-8 h-8 text-primary" />,
    preview: (
      <div className="space-y-4">
        {[
          { icon: Coffee, title: 'Blue Tokai Coffee', time: 'Today, 10:24 AM', amount: '₹240', color: 'bg-primary/10', text: 'text-primary' },
          { icon: Car, title: 'Uber Premium', time: 'Yesterday', amount: '₹485', color: 'bg-secondary-container/30', text: 'text-on-secondary-container' },
          { icon: ShoppingBag, title: 'Zara Home', time: '24 Oct', amount: '₹2,999', color: 'bg-tertiary-container/10', text: 'text-tertiary' },
        ].map((item, i) => (
          <div key={i} className="liquid-glass p-4 rounded-2xl flex items-center justify-between border border-white/40">
            <div className="flex items-center gap-4">
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", item.color, item.text)}>
                <item.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">{item.title}</p>
                <p className="text-[10px] text-outline">{item.time}</p>
              </div>
            </div>
            <span className="font-bold text-sm">{item.amount}</span>
          </div>
        ))}
      </div>
    )
  },
  {
    title: "Smart Analytics",
    description: "Visualize your wealth with liquid-smooth charts and deep spending insights.",
    icon: <ArrowRight className="w-8 h-8 text-primary" />,
    preview: (
      <div className="h-40 flex items-end justify-between gap-1">
        {[40, 60, 90, 55, 70].map((h, i) => (
          <div key={i} className="w-full bg-primary/10 rounded-t-xl overflow-hidden" style={{ height: `${h}%` }}>
            <motion.div 
              initial={{ height: 0 }}
              animate={{ height: '60%' }}
              className="bg-primary-container w-full h-full"
            />
          </div>
        ))}
      </div>
    )
  },
  {
    title: "Split with Friends",
    description: "Settle bills instantly. No more awkward \"who owes what\" conversations.",
    icon: <Coffee className="w-8 h-8 text-primary" />,
    preview: (
      <div className="flex flex-col items-center gap-6">
        <div className="flex -space-x-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-16 h-16 rounded-full border-4 border-white glass shadow-xl overflow-hidden bg-surface-container" />
          ))}
        </div>
        <div className="liquid-glass w-full p-4 rounded-2xl flex items-center gap-4 border border-white/40">
          <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
            <span className="text-xl">🌴</span>
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">Goa Trip 2024</p>
            <p className="text-[10px] text-outline">4 members active</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-secondary font-bold uppercase">You Owe</p>
            <p className="font-bold text-error">₹1,250</p>
          </div>
        </div>
      </div>
    )
  }
];

export default function Onboarding() {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (current < slides.length - 1) {
      setCurrent(current + 1);
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Scrollable Content Area */}
      <div className="flex-1 flex flex-col items-center px-5 pt-12 overflow-y-auto">
        <div className="w-full max-w-sm glass rounded-[32px] p-6 mb-8 shadow-2xl shadow-primary/5 h-[300px] flex flex-col mt-4 shrink-0">
          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col justify-center"
              >
                {slides[current].preview}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="text-center h-[120px] shrink-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <h2 className="text-3xl font-bold text-on-surface mb-2 tracking-tight">{slides[current].title}</h2>
              <p className="text-on-surface-variant leading-relaxed max-w-[280px] mx-auto">{slides[current].description}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Fixed Footer for Navigation */}
      <div className="w-full px-5 pb-12 pt-6 bg-background flex flex-col items-center gap-8 border-t border-white/5">
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                current === i ? "w-8 bg-primary" : "w-2 bg-primary/20"
              )} 
            />
          ))}
        </div>

        <button 
          onClick={handleNext}
          className="w-full max-w-sm h-14 bg-gradient-to-b from-primary-container to-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/30 flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          {current === slides.length - 1 ? 'Get Started' : 'Next'}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
