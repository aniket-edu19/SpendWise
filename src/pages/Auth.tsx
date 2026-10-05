import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet, Mail, Lock, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Auth() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, signInGuest } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setError(null);
    try {
      if (isRegistering) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestMode = async () => {
    setLoading(true);
    try {
      await signInGuest();
    } catch (err: any) {
      setError(err.message || 'Guest login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-background flex flex-col items-center px-5 py-12 relative overflow-y-auto"
    >
      {/* Decorative Elements */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[40%] bg-primary/5 blur-[120px] rounded-full -z-10" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[40%] bg-secondary/5 blur-[120px] rounded-full -z-10" />

      <header className="w-full text-center mt-8 mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-[22%] bg-primary-container shadow-xl shadow-primary/20 mb-6">
          <Wallet className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-on-background tracking-tighter">SpendWise</h1>
        <p className="text-sm text-on-surface-variant mt-1 opacity-80">Financial Serenity Starts Here</p>
      </header>

      <div className="w-full max-w-sm glass rounded-[32px] p-8 shadow-2xl shadow-primary/5 border-t border-l border-white/60">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-[10px] font-bold uppercase text-center">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-outline ml-1">Email Address</label>
            <div className="relative">
              <input 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-14 px-5 rounded-2xl liquid-glass border border-white/40 text-on-background placeholder:text-outline/40 outline-none focus:border-primary/40 transition-colors" 
                placeholder="name@example.com" 
                type="email" 
              />
              <Mail className="absolute right-5 top-4 text-outline/30 w-5 h-5" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-outline">Password</label>
              {!isRegistering && <button type="button" className="text-[10px] font-bold text-primary tracking-widest opacity-60">FORGOT?</button>}
            </div>
            <div className="relative">
              <input 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full h-14 px-5 rounded-2xl liquid-glass border border-white/40 text-on-background placeholder:text-outline/40 outline-none focus:border-primary/40 transition-colors" 
                placeholder="••••••••" 
                type="password" 
              />
              <Lock className="absolute right-5 top-4 text-outline/30 w-5 h-5" />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-gradient-to-b from-primary-container to-primary text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isRegistering ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="relative flex items-center py-8">
          <div className="flex-grow border-t border-white/30"></div>
          <span className="flex-shrink mx-4 text-[10px] font-bold text-outline uppercase tracking-widest">Or continue with</span>
          <div className="flex-grow border-t border-white/30"></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => signInWithGoogle()}
            className="flex items-center justify-center h-14 rounded-2xl liquid-glass border border-white/40 hover:bg-white/60 transition-colors active:scale-95"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 mr-3" />
            <span className="text-sm font-semibold">Google</span>
          </button>
          <button 
            disabled
            className="flex items-center justify-center h-14 rounded-2xl liquid-glass border border-white/40 opacity-50 cursor-not-allowed"
          >
            <span className="text-sm font-semibold">Apple</span>
          </button>
        </div>
      </div>

      <footer className="mt-8 flex flex-col items-center gap-6 w-full pb-8">
        <p className="text-sm text-on-surface-variant">
          {isRegistering ? 'Already have an account?' : "Don't have an account?"} 
          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="font-bold text-primary ml-1 hover:underline"
          >
            {isRegistering ? 'Sign In' : 'Create Account'}
          </button>
        </p>
        
        <button 
          onClick={handleGuestMode}
          disabled={loading}
          className="text-[10px] font-bold text-outline tracking-[0.2em] flex items-center gap-2 hover:text-primary transition-colors disabled:opacity-50"
        >
          {loading ? 'LOADING...' : 'CONTINUE AS GUEST'}
          {!loading && <ArrowRight className="w-3 h-3" />}
        </button>

        <div className="mt-4 opacity-30 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          <span className="text-[10px] font-bold tracking-widest uppercase text-center leading-tight">Data Securely Stored on Cloud</span>
        </div>
      </footer>
    </motion.div>
  );
}
