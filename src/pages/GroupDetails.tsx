import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Settings, Users, CreditCard, ChevronRight, Utensils, Zap, Plus, Trash2, UserPlus, X, Coffee, Car, ShoppingBag, Heart, Film, Wallet, Download, Edit3, Save } from 'lucide-react';
import { db, auth as firebaseAuth } from '../lib/firebase';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { Group, GroupMember, Expense, Category, MemberRole, SplitType } from '../types';
import { groupService, expenseService } from '../services/expenseService';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { jsPDF } from 'jspdf';
import { toCanvas } from 'html-to-image';

const getCategoryStyles = (category: Category) => {
  switch (category) {
    case Category.Food: return { icon: Coffee, color: 'text-orange-600', bg: 'bg-orange-100' };
    case Category.Travel: return { icon: Car, color: 'text-blue-600', bg: 'bg-blue-100' };
    case Category.Shopping: return { icon: ShoppingBag, color: 'text-purple-600', bg: 'bg-purple-100' };
    case Category.Health: return { icon: Heart, color: 'text-rose-600', bg: 'bg-rose-100' };
    case Category.Fun: return { icon: Film, color: 'text-indigo-600', bg: 'bg-indigo-100' };
    case Category.Payment: return { icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-100' };
    case Category.Income: return { icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-100' };
    default: return { icon: Zap, color: 'text-primary', bg: 'bg-primary/5' };
  }
};

export default function GroupDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [showSettleUp, setShowSettleUp] = useState(false);
  const [settleAmount, setSettleAmount] = useState('');
  const [selectedDebtor, setSelectedDebtor] = useState<string>('');
  const [newMemberName, setNewMemberName] = useState('');
  const [settleLoading, setSettleLoading] = useState(false);
  const [settlePayer, setSettlePayer] = useState('');
  const [settleReceiver, setSettleReceiver] = useState('');

  const [showManageMembers, setShowManageMembers] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingMemberName, setEditingMemberName] = useState('');
  const [isUpdatingMember, setIsUpdatingMember] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;

    const groupUnsub = onSnapshot(doc(db, 'groups', id), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Group;
        if (data.deleted) {
          navigate('/groups');
        } else {
          setGroup(data);
        }
      }
    });

    const membersUnsub = groupService.getMembers(id, (m) => {
      setMembers(m);
      if (m.length > 0 && !selectedDebtor) {
        // Find a member who owes money or just the first non-me member
        const others = m.filter(mem => mem.userId !== user?.id);
        if (others.length > 0) setSelectedDebtor(others[0].userId);
      }
    });

    const expenseQuery = query(collection(db, `groups/${id}/expenses`), orderBy('date', 'desc'));
    const expenseUnsub = onSnapshot(expenseQuery, (snap) => {
      setExpenses(snap.docs.map(d => d.data() as Expense));
      setLoading(false);
    });

    return () => {
      groupUnsub();
      membersUnsub();
      expenseUnsub();
    };
  }, [id, navigate, user?.id]);

  const handleDeleteGroup = async () => {
    if (!id || !window.confirm('Are you sure you want to delete this circle?')) return;
    try {
      await groupService.deleteGroup(id);
      navigate('/groups');
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddMember = async () => {
    if (!id || !newMemberName.trim()) return;
    try {
      await groupService.addMember(id, newMemberName.trim());
      setNewMemberName('');
      setShowAddMember(false);
      setShowSettings(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleRenameGroup = async () => {
    if (!id || !newGroupName.trim()) return;
    setIsRenaming(true);
    try {
      await groupService.renameGroup(id, newGroupName.trim());
      setShowRename(false);
      setShowSettings(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleUpdateMemberName = async () => {
    if (!id || !editingMemberId || !editingMemberName.trim()) return;
    setIsUpdatingMember(true);
    try {
      await groupService.updateMemberName(id, editingMemberId, editingMemberName.trim());
      setEditingMemberId(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdatingMember(false);
    }
  };

  const handleSettleUpClick = () => {
    if (members.length > 0) {
      const others = members.filter(mem => mem.userId !== user?.id);
      if (others.length > 0) {
        const first = others[0];
        // Balance > 0 means the member is owed (You owe them). 
        // Settlement usually means YOU pay THEM.
        if (first.balance > 0) {
          setSettlePayer(user?.id || '');
          setSettleReceiver(first.userId);
        } else {
          setSettlePayer(first.userId);
          setSettleReceiver(user?.id || '');
        }
        setSettleAmount(Math.abs(first.balance).toString());
      }
    }
    setShowSettleUp(true);
  };

  const handleSettleUp = async () => {
    if (!id || !user || !settleAmount || !settlePayer || !settleReceiver) return;
    setSettleLoading(true);
    try {
      await expenseService.addExpense({
        amount: parseFloat(settleAmount),
        description: 'Settlement',
        category: Category.Payment,
        date: new Date().toISOString(),
        paidBy: settlePayer,
        groupId: id,
        isPersonal: false,
        splitType: SplitType.Equal,
        splits: { [settleReceiver]: parseFloat(settleAmount) }
      });
      setShowSettleUp(false);
      setSettleAmount('');
    } catch (error) {
      console.error(error);
    } finally {
      setSettleLoading(false);
    }
  };

  if (!group && !loading) return <div className="p-10 text-center">Group not found</div>;

  const isOwner = group?.ownerId === user?.id;

  const calculateTransfers = () => {
    const debtors = members.filter(m => m.balance < 0).sort((a, b) => a.balance - b.balance);
    const creditors = members.filter(m => m.balance > 0).sort((a, b) => b.balance - a.balance);
    
    const transfers: { from: GroupMember, to: GroupMember, amount: number }[] = [];
    let dIdx = 0, cIdx = 0;
    
    const dBalances = debtors.map(m => Math.abs(m.balance));
    const cBalances = creditors.map(m => m.balance);
    
    while (dIdx < debtors.length && cIdx < creditors.length) {
      const amount = Math.min(dBalances[dIdx], cBalances[cIdx]);
      if (amount > 0.01) {
        transfers.push({
          from: debtors[dIdx],
          to: creditors[cIdx],
          amount
        });
      }
      
      dBalances[dIdx] -= amount;
      cBalances[cIdx] -= amount;
      
      if (dBalances[dIdx] < 0.01) dIdx++;
      if (cBalances[cIdx] < 0.01) cIdx++;
    }
    return transfers;
  };

  const settlementInstructions = calculateTransfers();

  const handleDownloadPDF = async () => {
    if (!contentRef.current || !group) return;
    setIsExporting(true);
    
    try {
      const element = contentRef.current;
      
      // Filter out elements we don't want in the PDF
      const filter = (node: HTMLElement) => {
        const exclusionClasses = ['animate-bounce', 'fixed', 'absolute'];
        const isIgnored = node.getAttribute?.('data-html2canvas-ignore') === 'true';
        const hasExclusionClass = exclusionClasses.some(cls => node.classList?.contains(cls));
        return !isIgnored && !hasExclusionClass;
      };

      const canvas = await toCanvas(element, {
        filter: filter as any,
        backgroundColor: '#f9f9ff',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          // Ensure we capture the full content height
          height: element.scrollHeight + 'px',
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      
      const scaledWidth = imgWidth * ratio;
      const scaledHeight = imgHeight * ratio;
      
      // If content is very long, it will be scaled down to fit one page
      // For very long lists, we could implement multi-page, but one page "long" is often preferred for digital exports
      pdf.addImage(imgData, 'JPEG', (pdfWidth - scaledWidth) / 2, 0, scaledWidth, scaledHeight);
      pdf.save(`${group.name.replace(/\s+/g, '_')}_expenses.pdf`);
      
    } catch (err) {
      console.error('PDF Export Error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="px-5 pt-8 space-y-8 min-h-screen pb-32"
      ref={contentRef}
    >
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 -ml-2 text-primary"
            data-html2canvas-ignore="true"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-primary/40 uppercase tracking-[0.2em] leading-none mb-1">Spendwise</span>
            <h1 className="text-xl font-bold text-primary tracking-tight leading-none">{group?.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-4 text-primary relative" data-html2canvas-ignore="true">
          <button 
            onClick={handleDownloadPDF} 
            disabled={isExporting}
            className="p-2 hover:bg-primary/5 rounded-full transition-colors disabled:opacity-50"
          >
            <Download className={cn("w-5 h-5", isExporting && "animate-bounce")} />
          </button>
          <button onClick={() => setShowSettings(!showSettings)} className="p-2">
            <Settings className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-full bg-primary-fixed overflow-hidden border border-primary/20 flex items-center justify-center">
             {firebaseAuth.currentUser?.photoURL ? (
               <img src={firebaseAuth.currentUser.photoURL} className="w-full h-full object-cover" />
             ) : (
               <Users className="w-4 h-4 text-primary/40" />
             )}
          </div>

          <AnimatePresence>
            {showSettings && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowSettings(false)}
                  className="fixed inset-0 z-40 bg-black/5 backdrop-blur-[2px]"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  className="absolute right-0 top-12 w-48 glass rounded-2xl shadow-2xl p-2 z-50 border border-white/60"
                >
                  <button 
                    onClick={() => { setShowRename(true); setNewGroupName(group?.name || ''); setShowSettings(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-primary/5 rounded-xl transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    Rename Circle
                  </button>
                  <button 
                    onClick={() => { setShowAddMember(true); setShowSettings(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-primary/5 rounded-xl transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Member
                  </button>
                  <button 
                    onClick={() => { setShowManageMembers(true); setShowSettings(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-primary/5 rounded-xl transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    Manage Members
                  </button>
                  {isOwner && (
                    <button 
                      onClick={handleDeleteGroup}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-error hover:bg-error/5 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Circle
                    </button>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Rename Circle Modal */}
      <AnimatePresence>
        {showRename && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRename(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="relative w-full max-w-sm glass rounded-[32px] p-8 shadow-2xl border border-white/60"
            >
              <button 
                onClick={() => setShowRename(false)}
                className="absolute top-4 right-4 p-2 text-outline"
              >
                <X className="w-6 h-6" />
              </button>
              <h3 className="text-2xl font-bold mb-6">Rename Circle</h3>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2 block">New Name</label>
                  <input 
                    autoFocus
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Enter new name..."
                    className="w-full bg-white/40 border-none rounded-2xl p-4 font-bold focus:ring-2 ring-primary transition-all"
                  />
                </div>
                <button 
                  onClick={handleRenameGroup}
                  disabled={isRenaming || !newGroupName.trim() || newGroupName === group?.name}
                  className="w-full h-14 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/30 active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isRenaming ? 'Updating...' : 'Save Name'}
                  {!isRenaming && <Save className="w-5 h-5" />}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Member Modal */}
      <AnimatePresence>
        {showAddMember && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddMember(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="relative w-full max-w-sm glass rounded-[32px] p-8 shadow-2xl border border-white/60"
            >
              <button 
                onClick={() => setShowAddMember(false)}
                className="absolute top-4 right-4 p-2 text-outline"
              >
                <X className="w-6 h-6" />
              </button>
              <h3 className="text-2xl font-bold mb-6">Add Member</h3>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2 block">Name</label>
                  <input 
                    autoFocus
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="Enter name..."
                    className="w-full bg-white/40 border-none rounded-2xl p-4 font-bold focus:ring-2 ring-primary transition-all"
                  />
                </div>
                <button 
                  onClick={handleAddMember}
                  disabled={!newMemberName.trim()}
                  className="w-full h-14 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/30 active:scale-95 transition-transform disabled:opacity-50"
                >
                  Add to Circle
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manage Members Modal */}
      <AnimatePresence>
        {showManageMembers && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowManageMembers(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm glass rounded-[32px] p-8 shadow-2xl border border-white/60 max-h-[80vh] flex flex-col"
            >
              <button 
                onClick={() => setShowManageMembers(false)}
                className="absolute top-4 right-4 p-2 text-outline"
              >
                <X className="w-6 h-6" />
              </button>
              <h3 className="text-2xl font-bold mb-6">Manage Members</h3>
              
              <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pr-1">
                {members.map(member => (
                  <div key={member.userId} className="glass p-3 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs overflow-hidden">
                        {member.photoURL ? (
                          <img src={member.photoURL} className="w-full h-full object-cover" />
                        ) : (
                          member.name.charAt(0)
                        )}
                      </div>
                      {editingMemberId === member.userId ? (
                        <input 
                          autoFocus
                          value={editingMemberName}
                          onChange={(e) => setEditingMemberName(e.target.value)}
                          onBlur={handleUpdateMemberName}
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdateMemberName()}
                          className="bg-transparent border-b border-primary font-bold text-sm outline-none w-full"
                          disabled={isUpdatingMember}
                        />
                      ) : (
                        <span className="font-bold text-sm truncate">{member.name} {member.userId === user?.id && '(You)'}</span>
                      )}
                    </div>
                    {editingMemberId !== member.userId && (
                      <button 
                        onClick={() => {
                          setEditingMemberId(member.userId);
                          setEditingMemberName(member.name);
                        }}
                        className="p-2 hover:bg-primary/5 rounded-lg text-primary transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              <button 
                onClick={() => { setShowAddMember(true); setShowManageMembers(false); }}
                className="mt-6 w-full py-3 bg-primary/10 text-primary font-bold rounded-2xl hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Add New Member
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settle Up Modal */}
      <AnimatePresence>
        {showSettleUp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettleUp(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="relative w-full max-w-sm glass rounded-[32px] p-8 shadow-2xl border border-white/60"
            >
              <button 
                onClick={() => setShowSettleUp(false)}
                className="absolute top-4 right-4 p-2 text-outline"
              >
                <X className="w-6 h-6" />
              </button>
              <h3 className="text-2xl font-bold mb-6">Settle Up</h3>
              <div className="space-y-6">
                <div className="flex items-center gap-4 py-2">
                   <div className="flex-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2 block">Payer</label>
                      <select 
                        className="w-full bg-white/40 border-none rounded-2xl p-3 font-bold text-sm"
                        value={settlePayer}
                        onChange={(e) => {
                          setSettlePayer(e.target.value);
                          if (e.target.value === settleReceiver) {
                            const other = members.find(m => m.userId !== e.target.value);
                            if (other) setSettleReceiver(other.userId);
                          }
                        }}
                      >
                        {members.map(m => (
                          <option key={m.userId} value={m.userId}>{m.userId === user?.id ? 'You' : m.name}</option>
                        ))}
                      </select>
                   </div>
                   <ArrowLeft className="w-5 h-5 text-outline mt-6 rotate-180" />
                   <div className="flex-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2 block">Receiver</label>
                      <select 
                        className="w-full bg-white/40 border-none rounded-2xl p-3 font-bold text-sm"
                        value={settleReceiver}
                        onChange={(e) => setSettleReceiver(e.target.value)}
                      >
                        {members.filter(m => m.userId !== settlePayer).map(m => (
                          <option key={m.userId} value={m.userId}>{m.userId === user?.id ? 'You' : m.name}</option>
                        ))}
                      </select>
                   </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2 block">Amount</label>
                  <input 
                    type="number"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white/40 border-none rounded-2xl p-4 font-bold focus:ring-2 ring-primary text-2xl text-center"
                  />
                </div>
                
                <button 
                  onClick={handleSettleUp}
                  disabled={settleLoading || !settleAmount || settlePayer === settleReceiver}
                  className="w-full h-14 bg-secondary text-white font-bold rounded-2xl shadow-xl shadow-secondary/30 active:scale-95 transition-transform disabled:opacity-50"
                >
                  {settleLoading ? 'Confirming...' : 'Record Payment'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <section className="relative overflow-hidden rounded-[32px] p-8 glass shadow-xl bg-gradient-to-br from-indigo-50/50 to-white/50">
        <div className="relative z-10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary opacity-60 mb-1">Total Group Expense</p>
          <h2 className="text-4xl font-bold text-primary tracking-tight">₹{group?.totalBalance.toLocaleString() || '0'}</h2>
          <div className="mt-8 flex gap-3">
            <button 
              onClick={handleSettleUpClick}
              className="flex-1 bg-gradient-to-b from-primary-container to-primary text-white py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-primary/30 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <CreditCard className="w-4 h-4 fill-white/20" />
              Settle Up
            </button>
          </div>
        </div>
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-secondary-fixed/20 rounded-full blur-3xl" />
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-bold tracking-tight px-1">Debt Summary</h3>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {members.map(member => (
            <div key={member.userId} className={cn(
              "glass p-5 rounded-[24px] min-w-[160px] space-y-3 border-l-4",
              member.balance >= 0 ? "border-l-secondary" : "border-l-error"
            )}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-surface-container overflow-hidden border border-white flex items-center justify-center">
                  {member.photoURL ? (
                    <img src={member.photoURL} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary">
                      <Users className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <span className="text-[12px] font-bold">{member.userId === user?.id ? 'You' : member.name.split(' ')[0]}</span>
              </div>
              <div>
                <p className="text-[10px] text-outline font-bold uppercase tracking-widest leading-none mb-1">
                  {member.balance >= 0 ? 'is owed' : 'owes'}
                </p>
                <p className={cn("text-xl font-bold tracking-tight", 
                  member.balance >= 0 ? "text-secondary" : "text-error"
                )}>
                  ₹{Math.abs(member.balance).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>

        {settlementInstructions.length > 0 && (
          <div className="glass p-5 rounded-3xl space-y-4 border border-white/40">
            <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Settlement Instructions</p>
            <div className="space-y-3">
              {settlementInstructions.map((t, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-error">{t.from.userId === user?.id ? 'You' : t.from.name.split(' ')[0]}</span>
                    <ArrowLeft className="w-3 h-3 text-outline rotate-180" />
                    <span className="font-bold text-secondary">{t.to.userId === user?.id ? 'You' : t.to.name.split(' ')[0]}</span>
                  </div>
                  <span className="font-bold tracking-tight">₹{t.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-6">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xl font-bold tracking-tight">Recent Transactions</h3>
          <button className="text-primary font-bold text-[12px] uppercase tracking-widest">See All</button>
        </div>

        <div className="space-y-4">
          {expenses.length === 0 ? (
            <div className="glass p-8 rounded-3xl text-center flex flex-col items-center gap-4">
              <Utensils className="w-10 h-10 text-outline opacity-20" />
              <p className="text-outline text-sm">No expenses yet. Time to split something!</p>
            </div>
          ) : expenses.map(expense => {
            const styles = getCategoryStyles(expense.category);
            const Icon = styles.icon;
            
            return (
              <div key={expense.id} className="group relative">
                <div 
                  onClick={() => navigate('/add-expense', { state: { expense } })}
                  className="glass p-4 rounded-2xl flex items-center justify-between group active:bg-white/40 cursor-pointer transition-all hover:border-primary/20 border border-transparent"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-colors group-hover:bg-primary group-hover:text-white", styles.bg, styles.color)}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold">{expense.description}</p>
                      <p className="text-[12px] text-outline">
                        {format(new Date(expense.date), 'MMM d')} • {expense.category}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-on-background">₹{expense.amount.toLocaleString()}</p>
                      <p className="text-[10px] text-outline font-bold uppercase tracking-wider">
                        {expense.category === Category.Payment ? 'Settlement' : `Paid by ${members.find(m => m.userId === expense.paidBy)?.name.split(' ')[0] || 'Member'}`}
                      </p>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this transaction?')) {
                          expenseService.deleteExpense(expense);
                        }
                      }}
                      className="p-2 text-error/60 hover:text-error hover:bg-error/10 rounded-xl transition-all border border-white/20 bg-white/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <button 
        onClick={() => navigate('/add-expense', { state: { groupId: id } })}
        className="fixed bottom-28 right-6 w-14 h-14 bg-primary-container text-white rounded-full shadow-2xl flex items-center justify-center z-50 active:scale-95 transition-transform"
        data-html2canvas-ignore="true"
      >
        <Plus className="w-8 h-8" />
      </button>
    </motion.div>
  );
}
