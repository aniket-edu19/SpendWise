import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Sparkles, ArrowRight, Check, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

const AVATARS = [
  'https://api.dicebear.com/7.x/miniavs/svg?seed=Felix',
  'https://api.dicebear.com/7.x/miniavs/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/miniavs/svg?seed=Julian',
  'https://api.dicebear.com/7.x/miniavs/svg?seed=Luna',
  'https://api.dicebear.com/7.x/miniavs/svg?seed=Leo',
  'https://api.dicebear.com/7.x/miniavs/svg?seed=Maya',
];

export default function ProfileSetup() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.photoURL || AVATARS[0]);
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!name || !gender) return;
    setLoading(true);
    try {
      await updateProfile({
        name,
        gender: gender as 'male' | 'female' | 'other',
        photoURL: selectedAvatar,
        hasCompletedSetup: true
      });
      navigate('/');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="min-h-screen bg-background px-5 py-12 flex flex-col items-center"
    >
      <div className="w-full max-w-sm space-y-8">
        <header className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[22%] bg-primary/10 mb-2">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Complete Profile</h1>
          <p className="text-sm text-outline">Let's personalize your experience</p>
        </header>

        <div className="space-y-6">
          {/* Avatar Selection */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-outline ml-1">Choose Avatar</label>
            <div className="grid grid-cols-3 gap-3">
              {AVATARS.map((avatar) => (
                <button
                  key={avatar}
                  onClick={() => setSelectedAvatar(avatar)}
                  className={cn(
                    "aspect-square rounded-2xl overflow-hidden border-2 transition-all p-1 bg-white/40",
                    selectedAvatar === avatar ? "border-primary scale-95" : "border-transparent"
                  )}
                >
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover rounded-xl" />
                </button>
              ))}
            </div>
          </div>

          {/* Name Input */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-outline ml-1">Display Name</label>
            <div className="relative">
              <input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-14 px-5 pl-12 rounded-2xl glass border border-white/40 text-on-background focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                placeholder="Full Name" 
              />
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline" />
            </div>
          </div>

          {/* Gender selection */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-outline ml-1">Gender</label>
            <div className="grid grid-cols-3 gap-3">
              {['male', 'female', 'other'].map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g as any)}
                  className={cn(
                    "h-12 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all glass border border-white/40 flex items-center justify-center gap-2",
                    gender === g ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" : "text-outline bg-white/20"
                  )}
                >
                  {gender === g && <Check className="w-3 h-3" />}
                  {g}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={handleComplete}
            disabled={loading || !name || !gender}
            className="w-full h-14 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
          >
            {loading ? 'SAVING...' : 'GET STARTED'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
