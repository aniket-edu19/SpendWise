import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserIcon, LogOut, ChevronRight, CreditCard, Moon, Bell, ShieldCheck, Download, Edit2, X, Check, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

const AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Julian',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Maya',
];

export default function Profile() {
  const { user, logout, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editAvatar, setEditAvatar] = useState(user?.photoURL || AVATARS[0]);
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await updateProfile({
        name: editName,
        photoURL: editAvatar
      });
      setIsEditing(false);
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 pt-8 pb-40 space-y-8">
      <section className="flex flex-col items-center">
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-primary to-secondary shadow-2xl">
            <div className="w-full h-full rounded-full overflow-hidden border-2 border-white bg-surface-container">
              {user?.photoURL && <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />}
            </div>
          </div>
          <button 
            onClick={() => setIsEditing(true)}
            className="absolute bottom-0 right-0 bg-primary text-white p-1.5 rounded-full border-2 border-white shadow-lg active:scale-95 transition-all"
          >
            <Edit2 className="w-3 h-3" />
          </button>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{user?.name}</h1>
        <p className="text-sm text-outline font-medium">{user?.email}</p>
      </section>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: 100 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 100 }}
              className="relative w-full max-w-sm glass rounded-[32px] p-6 shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Edit Profile</h3>
                <button onClick={() => setIsEditing(false)} className="p-2 rounded-full hover:bg-black/5">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-outline ml-1">Choose Avatar</label>
                  <div className="grid grid-cols-3 gap-2">
                    {AVATARS.map((avatar) => (
                      <button
                        key={avatar}
                        onClick={() => setEditAvatar(avatar)}
                        className={cn(
                          "aspect-square rounded-xl overflow-hidden border-2 transition-all p-0.5",
                          editAvatar === avatar ? "border-primary bg-primary/10" : "border-transparent"
                        )}
                      >
                        <img src={avatar} alt="Avatar" className="w-full h-full object-cover rounded-lg" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-outline ml-1">Display Name</label>
                  <div className="relative">
                    <input 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full h-12 px-4 pl-10 rounded-xl bg-black/5 border border-black/5 focus:border-primary/20 outline-none font-bold text-sm"
                      placeholder="Your Name"
                    />
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                  </div>
                </div>

                <button 
                  onClick={handleSaveProfile}
                  disabled={saving || !editName.trim()}
                  className="w-full h-12 bg-primary text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Check className="w-5 h-5 animate-pulse" /> : <Save className="w-5 h-5" />}
                  {saving ? 'SAVING...' : 'SAVE CHANGES'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="glass rounded-[2rem] p-4 flex items-center justify-between border border-white shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
            <ShieldCheck className="w-6 h-6 fill-primary/10" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Gold Member</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Plan expires in 24 days</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-outline opacity-30" />
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-outline px-2 mb-3">Preferences</h2>
          <div className="glass rounded-[2rem] overflow-hidden border border-white shadow-sm divide-y divide-white/20 text-sm">
            <div className="flex items-center justify-between p-4 px-5">
              <div className="flex items-center gap-4">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span className="font-bold">Currency</span>
              </div>
              <div className="flex items-center gap-1 text-outline">
                <span className="font-bold">₹ INR</span>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 px-5">
              <div className="flex items-center gap-4">
                <Moon className="w-5 h-5 text-slate-700" />
                <span className="font-bold">Dark Mode</span>
              </div>
              <div className="w-12 h-7 bg-primary rounded-full relative flex items-center px-1">
                <div className="w-5 h-5 bg-white rounded-full shadow-sm absolute right-1" />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 px-5">
              <div className="flex items-center gap-4">
                <Bell className="w-5 h-5 text-orange-600" />
                <span className="font-bold">Notifications</span>
              </div>
              <ChevronRight className="w-4 h-4 text-outline opacity-50" />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-outline px-2 mb-3">Data & Security</h2>
          <div className="glass rounded-[2rem] overflow-hidden border border-white shadow-sm divide-y divide-white/20 text-sm">
            <div className="flex items-center justify-between p-4 px-5">
              <div className="flex items-center gap-4">
                <Download className="w-5 h-5 text-green-600" />
                <span className="font-bold">Export Data</span>
              </div>
              <div className="flex items-center gap-1 text-outline">
                <span className="font-bold uppercase text-[10px]">CSV, PDF</span>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 px-5">
              <div className="flex items-center gap-4">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
                <span className="font-bold">Security & Privacy</span>
              </div>
              <ChevronRight className="w-4 h-4 text-outline opacity-50" />
            </div>
          </div>
        </div>
      </div>

      <button 
        onClick={logout}
        className="w-full py-4 text-center text-error font-bold glass rounded-[2rem] border border-error/10 hover:bg-error/5 transition-colors active:scale-95"
      >
        Log Out
      </button>
      <p className="text-center text-[10px] font-bold uppercase tracking-widest text-outline opacity-30 mt-8">Version 2.4.0 (892)</p>
    </motion.div>
  );
}
