import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Tag, Search, Check, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { groupService } from '../services/expenseService';

export default function CreateGroup() {
  const [name, setName] = useState('');
  const [manualMemberName, setManualMemberName] = useState('');
  const [members, setMembers] = useState<{name: string, userId?: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!name || !user) return;
    setLoading(true);
    try {
      const groupId = await groupService.createGroup(name, user.id, members);
      if (groupId) navigate(`/groups/${groupId}`);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addManualMember = () => {
    if (!manualMemberName.trim()) return;
    setMembers([...members, { name: manualMemberName.trim() }]);
    setManualMemberName('');
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="px-5 pt-8 pb-32"
    >
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-primary">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-primary">Create Circle</h1>
      </header>

      <div className="mb-8">
        <h2 className="text-4xl font-bold tracking-tight mb-2">New Circle</h2>
        <p className="text-outline text-sm">Organize shared expenses with high-fidelity transparency.</p>
      </div>

      <div className="glass liquid-glass rounded-[32px] p-6 mb-8 border border-white/60">
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-full bg-surface-container border-2 border-dashed border-outline-variant flex flex-col items-center justify-center text-primary cursor-pointer hover:bg-surface-container-high transition-colors group">
            <Camera className="w-8 h-8 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-widest mt-1">Add Photo</span>
          </div>
        </div>

        <div className="border-b border-outline-variant/30 py-3 mb-6 flex items-center gap-3">
          <Tag className="w-6 h-6 text-primary opacity-60" />
          <input 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-transparent border-none focus:ring-0 w-full text-xl font-bold placeholder:text-outline-variant" 
            placeholder="Circle Name" 
            type="text" 
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-white/40 rounded-2xl">
          <div className="flex items-center gap-3">
            <UserPlus className="w-6 h-6 text-secondary" />
            <span className="font-medium">Add yourself by default</span>
          </div>
          <div className="w-12 h-6 bg-secondary-container rounded-full relative flex items-center px-1">
            <div className="w-4 h-4 bg-white rounded-full shadow-sm ml-auto" />
          </div>
        </div>
      </div>

      <section className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Add Members</h3>
          <span className="text-[10px] font-bold text-primary bg-primary/5 px-3 py-1 rounded-full uppercase tracking-widest">Selected: {members.length + 1}</span>
        </div>

        <div className="glass rounded-2xl flex items-center px-4 py-3 mb-6 border border-white/40">
          <Search className="w-5 h-5 text-outline opacity-50 mr-3" />
          <input 
            value={manualMemberName}
            onChange={(e) => setManualMemberName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addManualMember();
              }
            }}
            className="bg-transparent border-none focus:ring-0 w-full placeholder:text-outline-variant py-2" 
            placeholder="Type friend's name..." 
            type="text" 
          />
          <button 
            type="button"
            onClick={addManualMember}
            className="p-2 ml-2 bg-primary text-white rounded-xl active:scale-90 transition-transform"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          <div className="flex flex-col items-center min-w-[70px]">
            <div className="w-14 h-14 rounded-full border-2 border-primary p-0.5 mb-1 relative">
              <div className="w-full h-full rounded-full bg-surface-container overflow-hidden flex items-center justify-center font-bold text-primary">
                {user?.name.charAt(0)}
              </div>
              <div className="absolute -top-1 -right-1 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
                <Check className="w-3 h-3" />
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider">You</span>
          </div>

          {members.map((m, i) => (
            <div key={i} className="flex flex-col items-center min-w-[70px] group relative">
              <div className="w-14 h-14 rounded-full border-2 border-outline-variant p-0.5 mb-1 relative bg-white/40 flex items-center justify-center font-bold text-outline">
                {m.name.charAt(0)}
                <button 
                  onClick={() => removeMember(i)}
                  className="absolute -top-1 -right-1 bg-error text-white rounded-full w-5 h-5 flex items-center justify-center border-2 border-white"
                >
                  <span className="text-[10px]">✕</span>
                </button>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider truncate w-16 text-center">{m.name}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="fixed bottom-12 left-0 w-full px-5">
        <button 
          onClick={handleCreate}
          disabled={!name || loading}
          className="w-full h-14 bg-gradient-to-b from-primary-container to-primary text-white font-bold text-lg rounded-2xl shadow-xl shadow-primary/30 active:scale-95 transition-transform disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Circle'}
        </button>
      </div>
    </motion.div>
  );
}
