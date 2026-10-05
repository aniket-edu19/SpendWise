import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, ChevronRight, Plus, MapPin } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Group } from '../types';

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    // Fetch groups where user is a member
    const q = query(
      collection(db, 'groups'), 
      where('memberIds', 'array-contains', user.id)
    );
    
    const unsubscribe = onSnapshot(q, (snap) => {
      setGroups(snap.docs.map(doc => doc.data() as Group).filter(g => !g.deleted));
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-5 pt-8 space-y-8"
    >
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Circles</h1>
          <p className="text-sm text-outline">Manage shared expenses</p>
        </div>
        <button 
          onClick={() => navigate('/groups/create')}
          className="bg-primary-container text-white flex items-center gap-2 px-4 py-2 rounded-full shadow-lg shadow-primary/20 active:scale-95 transition-transform"
        >
          <Plus className="w-5 h-5" />
          <span className="text-[12px] font-bold uppercase tracking-wider">Create Circle</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
          <div className="relative w-48 h-48 flex items-center justify-center">
            <div className="absolute w-40 h-40 bg-white/40 backdrop-blur-xl rounded-[40px] rotate-6 border border-white/40 shadow-sm" />
            <div className="relative z-10 w-20 h-20 bg-primary rounded-full flex items-center justify-center shadow-2xl">
              <Users className="w-10 h-10 text-white" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold">No Circles Yet</h3>
            <p className="text-outline text-sm max-w-[200px] mx-auto mt-2">Start a group to split expenses with friends.</p>
          </div>
          <button 
            onClick={() => navigate('/groups/create')}
            className="text-primary font-bold text-sm underline"
          >
            Learn more about Groups
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {groups.map((group) => (
            <button 
              key={group.id}
              onClick={() => navigate(`/groups/${group.id}`)}
              className="glass rounded-3xl p-5 flex items-center gap-4 text-left active:scale-98 transition-all border border-white/40 shadow-sm"
            >
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-surface-container flex items-center justify-center">
                {group.imageURL ? (
                  <img src={group.imageURL} alt={group.name} className="w-full h-full object-cover" />
                ) : (
                  <MapPin className="w-6 h-6 text-primary/40" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{group.name}</h3>
                <p className="text-[12px] text-secondary font-medium">You are owed ₹{group.totalBalance}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-outline opacity-50" />
            </button>
          ))}
        </div>
      )}

      {/* Net Balance Summary */}
      {!loading && groups.length > 0 && (
        <div className="bg-primary-container p-6 rounded-[2rem] text-white shadow-xl shadow-primary/20 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl opacity-50" />
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Net Balance</span>
            </div>
            <div className="text-4xl font-bold tracking-tight mb-2">₹{groups.reduce((acc, g) => acc + g.totalBalance, 0)}</div>
            <p className="text-[12px] opacity-80">Across all active groups</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
