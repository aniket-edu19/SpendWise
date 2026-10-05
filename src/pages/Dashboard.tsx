import { motion } from 'motion/react';
import { TrendingUp, Coffee, Car, Wallet, Plus, Zap, ShoppingBag, Heart, Smartphone, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where, collectionGroup, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Expense, Category } from '../types';
import { expenseService } from '../services/expenseService';

const categoryIcons: any = {
  [Category.Food]: Coffee,
  [Category.Travel]: Car,
  [Category.Shopping]: ShoppingBag,
  [Category.Health]: Heart,
  [Category.Fun]: Zap,
  [Category.Income]: Wallet,
  [Category.Other]: Smartphone,
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState({
    totalBalance: 0,
    monthlySpend: 0,
    owedAmount: 0
  });

  useEffect(() => {
    if (!user) return;

    // Use collectionGroup to fetch ALL expenses (personal and group)
    const q = query(
      collectionGroup(db, 'expenses'),
      where('paidBy', '==', user.id),
      orderBy('date', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const expenses = snap.docs.map(d => d.data() as Expense);
      setRecentExpenses(expenses);
      
      // Basic calculation for stats (in a real app, these would be server-aggregated)
      const total = expenses.reduce((acc, curr) => acc + curr.amount, 0);
      const monthly = expenses
        .filter(e => new Date(e.date).getMonth() === new Date().getMonth())
        .reduce((acc, curr) => acc + curr.amount, 0);
      
      setStats(prev => ({
        ...prev,
        totalBalance: total, // This is just for demo, real balance is complex
        monthlySpend: monthly
      }));
    });

    // Also fetch group memberships for "You are owed"
    const membersQ = query(collectionGroup(db, 'members'), where('userId', '==', user.id));
    const unsubMembers = onSnapshot(membersQ, (snap) => {
      const totalOwed = snap.docs.reduce((acc, d) => {
        const balance = d.data().balance || 0;
        return acc + balance;
      }, 0);
      setStats(prev => ({ ...prev, owedAmount: totalOwed }));
    });

    return () => {
      unsubscribe();
      unsubMembers();
    };
  }, [user]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-5 pt-8 space-y-8"
    >
      <section>
        <p className="text-sm text-outline font-medium">Good Morning,</p>
        <h1 className="text-3xl font-bold tracking-tight">{user?.name.split(' ')[0]}</h1>
      </section>

      <div className="grid grid-cols-2 gap-4">
        {/* Total Balance Card */}
        <div className="col-span-2 glass rounded-3xl p-6 relative overflow-hidden bg-gradient-to-br from-white/40 to-primary/5">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">Estimated Spending</p>
            <h2 className="text-4xl font-bold text-primary tracking-tight">₹{stats.totalBalance.toLocaleString()}</h2>
            <div className="flex items-center gap-2 mt-4 text-secondary">
              <TrendingUp className="w-4 h-4" />
              <span className="text-[12px] font-medium">Global tracking active</span>
            </div>
          </div>
        </div>

        {/* Monthly Spend */}
        <div className="glass rounded-3xl p-5 border border-white/40">
          <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">This Month</p>
          <h3 className="text-xl font-bold">₹{stats.monthlySpend.toLocaleString()}</h3>
          <div className="w-full bg-surface-container h-1 rounded-full mt-4 text-primary">
             <div className="bg-current h-full rounded-full" style={{ width: '45%' }} />
          </div>
        </div>

        {/* Group Balances */}
        <button 
          onClick={() => navigate('/groups')}
          className="glass rounded-3xl p-5 border-l-4 border-secondary text-left active:scale-95 transition-transform"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">Circles</p>
          <p className="text-[12px] font-medium">{stats.owedAmount >= 0 ? 'You are owed' : 'You owe'}</p>
          <h3 className={cn("text-xl font-bold", stats.owedAmount >= 0 ? "text-secondary" : "text-error")}>
            ₹{Math.abs(stats.owedAmount).toLocaleString()}
          </h3>
        </button>
      </div>

      <section>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold tracking-tight">Recent Activity</h3>
          <button className="text-[10px] font-bold text-primary tracking-widest uppercase">View All</button>
        </div>

        <div className="space-y-4 pb-24">
          {recentExpenses.length === 0 ? (
            <div className="p-8 text-center text-outline text-sm italic glass rounded-3xl opacity-60">
              No recent activity. Start tracking!
            </div>
          ) : recentExpenses.map((item) => {
            const Icon = categoryIcons[item.category] || Zap;
            return (
              <div key={item.id} className="group relative">
                <div 
                  className="flex items-center justify-between p-4 bg-white/40 rounded-2xl border border-white/20 hover:bg-white/60 transition-colors cursor-pointer" 
                  onClick={() => item.groupId && navigate(`/groups/${item.groupId}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary/5 text-primary">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{item.description}</p>
                      <p className="text-[10px] text-outline uppercase font-bold tracking-wider">{item.category} • {new Date(item.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-bold text-sm">- ₹{item.amount.toLocaleString()}</p>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this transaction?')) {
                            expenseService.deleteExpense(item);
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

      <div className="glass bg-primary-container p-6 rounded-3xl text-white relative overflow-hidden border-none cursor-pointer group" onClick={() => navigate('/analytics')}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />
        <div className="flex justify-between items-center relative z-10">
          <div>
            <h4 className="font-bold text-lg">Spending Insights</h4>
            <p className="text-sm opacity-80 mt-1">You've spent 15% less than last week.</p>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-white/20 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
