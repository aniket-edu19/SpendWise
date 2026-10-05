import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Coffee, Car, ShoppingBag, Heart, Film, ArrowRight, Calendar, Users, Check, Wallet } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Category, SplitType, Group, GroupMember, Expense } from '../types';
import { expenseService, groupService } from '../services/expenseService';
import { cn } from '../lib/utils';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

const categories = [
  { name: Category.Food, icon: Coffee, color: 'text-orange-600', bg: 'bg-orange-100' },
  { name: Category.Travel, icon: Car, color: 'text-blue-600', bg: 'bg-blue-100' },
  { name: Category.Shopping, icon: ShoppingBag, color: 'text-purple-600', bg: 'bg-purple-100' },
  { name: Category.Health, icon: Heart, color: 'text-rose-600', bg: 'bg-rose-100' },
  { name: Category.Fun, icon: Film, color: 'text-indigo-600', bg: 'bg-indigo-100' },
];

export default function AddExpense() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const preSelectedGroupId = location.state?.groupId as string | undefined;
  const editExpense = location.state?.expense as Expense | undefined;

  const [amount, setAmount] = useState(editExpense ? editExpense.amount.toString() : '');
  const [description, setDescription] = useState(editExpense ? editExpense.description || '' : '');
  const [category, setCategory] = useState(editExpense ? editExpense.category : Category.Food);
  const [date, setDate] = useState(editExpense ? editExpense.date.split('T')[0] : new Date().toISOString().split('T')[0]);
  const [isGroup, setIsGroup] = useState(editExpense ? !!editExpense.groupId : !!preSelectedGroupId);
  const [selectedGroupId, setSelectedGroupId] = useState(editExpense?.groupId || preSelectedGroupId || '');
  const [paidBy, setPaidBy] = useState(editExpense?.paidBy || user?.id || '');
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(editExpense ? Object.keys(editExpense.splits) : []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!editExpense) setPaidBy(user.id);
    
    const fetchGroups = async () => {
      const q = query(collection(db, 'groups'), where('memberIds', 'array-contains', user.id));
      const snap = await getDocs(q);
      const fetchedGroups = snap.docs.map(d => d.data() as Group).filter(g => !g.deleted);
      setGroups(fetchedGroups);
      
      if (!editExpense) {
        if (preSelectedGroupId) {
          setIsGroup(true);
          setSelectedGroupId(preSelectedGroupId);
        } else if (fetchedGroups.length > 0 && isGroup && !selectedGroupId) {
          setSelectedGroupId(fetchedGroups[0].id);
        }
      }
    };
    fetchGroups();
  }, [user, preSelectedGroupId, editExpense]);

  useEffect(() => {
    if (selectedGroupId) {
      const unsubscribe = groupService.getMembers(selectedGroupId, (m) => {
        setMembers(m);
        // On initial load of group members, select everyone if no members were selected yet AND not editing
        if (selectedMembers.length === 0 && !editExpense) {
          setSelectedMembers(m.map(member => member.userId));
        }
      });
      return unsubscribe;
    } else {
      setMembers([]);
      if (!editExpense) setSelectedMembers([]);
    }
  }, [selectedGroupId, editExpense]);

  const handleSave = async () => {
    if (!user || !amount) return;
    setLoading(true);
    
    const numAmount = parseFloat(amount);
    const splits: Record<string, number> = {};
    
    if (isGroup && selectedMembers.length > 0) {
      const eachShare = numAmount / selectedMembers.length;
      selectedMembers.forEach(uid => splits[uid] = eachShare);
    } else {
      splits[user.id] = numAmount;
    }

    try {
      const expenseData = {
        amount: numAmount,
        description: description || 'Expense',
        category,
        date: new Date(date).toISOString(),
        paidBy: paidBy || user.id,
        groupId: isGroup ? selectedGroupId : undefined,
        isPersonal: !isGroup,
        splitType: SplitType.Equal,
        splits
      };

      if (editExpense) {
        await expenseService.updateExpense(editExpense, expenseData);
      } else {
        await expenseService.addExpense(expenseData);
      }
      navigate(-1);
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
      className="px-5 pt-8 pb-40 space-y-8"
    >
      <header className="flex justify-between items-center">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-outline">
          <X className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-primary">{editExpense ? 'Edit Expense' : 'New Expense'}</h1>
        <div className="w-8 h-8 rounded-full bg-primary-fixed" />
      </header>

      <section className="text-center space-y-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Amount</p>
        <div className="flex items-center justify-center gap-2">
          <span className="text-4xl font-bold text-outline opacity-40">₹</span>
          <input 
            value={amount}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                setAmount(val);
              }
            }}
            className="bg-transparent border-none focus:ring-0 text-5xl font-bold text-primary w-48 text-center placeholder:text-outline/20" 
            placeholder="0.00" 
            type="text"
            inputMode="decimal"
          />
        </div>
        <input 
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="bg-transparent border-none focus:ring-0 w-full text-center text-xl font-medium placeholder:text-outline/40" 
          placeholder="What was this for?" 
        />
      </section>

      <section className="space-y-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-outline ml-1">Category</p>
        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
          {categories.map((cat) => (
            <button 
              key={cat.name}
              onClick={() => setCategory(cat.name)}
              className="flex flex-col items-center gap-2 shrink-0 group"
            >
              <div className={cn(
                "w-16 h-16 rounded-3xl flex items-center justify-center transition-all shadow-sm",
                category === cat.name ? "glass scale-110 border-primary shadow-primary/10" : "bg-white/40 border border-white/20"
              )}>
                <cat.icon className={cn("w-6 h-6", category === cat.name ? "text-primary fill-primary/10" : "text-outline")} />
              </div>
              <span className={cn("text-[10px] font-bold uppercase tracking-widest", category === cat.name ? "text-primary" : "text-outline")}>
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass p-4 rounded-2xl space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Date</p>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary shrink-0" />
            <input 
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent border-none focus:ring-0 font-bold p-0 text-sm w-full outline-none"
            />
          </div>
        </div>
        <div className="glass p-1 rounded-2xl flex bg-surface-container-low">
          <button 
            onClick={() => setIsGroup(false)}
            className={cn("flex-1 py-3 px-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all", !isGroup ? "bg-white shadow-sm text-primary" : "text-outline")}
          >
            Personal
          </button>
          <button 
            onClick={() => {
              setIsGroup(true);
              if (groups.length > 0 && !selectedGroupId) setSelectedGroupId(groups[0].id);
            }}
            className={cn("flex-1 py-3 px-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all", isGroup ? "bg-white shadow-sm text-primary" : "text-outline")}
          >
            Circle
          </button>
        </div>
      </div>

      {isGroup && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {groups.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="glass p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center">
                    <Users className="w-5 h-5 text-on-secondary-container" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Circle</p>
                    <select 
                      value={selectedGroupId} 
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                      className="bg-transparent border-none focus:ring-0 font-bold p-0 text-sm w-full"
                    >
                      {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="glass p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Paid By</p>
                    <select 
                      value={paidBy} 
                      onChange={(e) => setPaidBy(e.target.value)}
                      className="bg-transparent border-none focus:ring-0 font-bold p-0 text-sm w-full"
                    >
                      {members.map(m => <option key={m.userId} value={m.userId}>{m.userId === user?.id ? 'You' : m.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-outline text-sm italic">You haven't created any circles yet.</p>
          )}

          {selectedGroupId && members.length > 0 && (
            <div className="glass rounded-3xl overflow-hidden border border-white/40">
              <div className="p-4 border-b border-white/20 flex justify-between items-center">
                <span className="font-bold">Split Equally</span>
                <div className="flex gap-2">
                  <button className="px-3 py-1 rounded-full bg-primary text-white text-[10px] font-bold">Equal</button>
                  <button className="px-3 py-1 rounded-full text-outline text-[10px] font-bold">%</button>
                </div>
              </div>
              <div className="p-2 space-y-1">
                {members.map(member => (
                  <button 
                    key={member.userId}
                    onClick={() => {
                      if (selectedMembers.includes(member.userId)) {
                        setSelectedMembers(selectedMembers.filter(id => id !== member.userId));
                      } else {
                        setSelectedMembers([...selectedMembers, member.userId]);
                      }
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
                        selectedMembers.includes(member.userId) ? "border-secondary bg-secondary/10" : "border-outline/20"
                      )}>
                        {selectedMembers.includes(member.userId) && <Check className="w-4 h-4 text-secondary" />}
                      </div>
                      <span className={cn("text-sm transition-all", selectedMembers.includes(member.userId) ? "font-bold text-on-background" : "text-outline")}>
                        {member.userId === user.id ? 'You' : member.name}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-outline">
                      ₹ {amount ? (parseFloat(amount) / (selectedMembers.length || 1)).toFixed(2) : '0.00'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      <footer className="fixed bottom-0 left-0 w-full p-5 glass border-t border-white/20 space-y-3 z-50">
        <button 
          onClick={handleSave}
          disabled={loading || !amount || (isGroup && !selectedGroupId)}
          className="w-full h-14 bg-gradient-to-b from-primary-container to-primary text-white font-bold text-lg rounded-2xl shadow-xl shadow-primary/30 active:scale-95 transition-transform disabled:opacity-50"
        >
          {loading ? 'Saving...' : editExpense ? 'Update Expense' : 'Save Expense'}
        </button>
        <button onClick={() => navigate(-1)} className="w-full py-3 text-sm font-bold text-outline hover:text-primary transition-colors">
          Cancel
        </button>
      </footer>
    </motion.div>
  );
}
