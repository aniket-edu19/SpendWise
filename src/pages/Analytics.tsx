import { motion } from 'framer-motion';
import { TrendingDown, Filter, Lightbulb, TrendingUp, Zap, Coffee, Car, ShoppingBag, Heart, Film, Wallet, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { query, collection, collectionGroup, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Expense, Category, Group } from '../types';
import { groupService } from '../services/expenseService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { format } from 'date-fns';

const categoryColors: Record<string, string> = {
  [Category.Food]: '#6366f1', // Indigo
  [Category.Travel]: '#3b82f6', // Blue
  [Category.Shopping]: '#a855f7', // Purple
  [Category.Health]: '#f43f5e', // Rose
  [Category.Fun]: '#6366f1', // Using same for now
  [Category.Payment]: '#10b981', // Emerald
  [Category.Income]: '#34d399', // Emerald light
  [Category.Other]: '#94a3b8', // Slate
};

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function Analytics() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'personal' | string>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | 'year'>('month');

  useEffect(() => {
    if (!user) return;
    
    // Fetch user groups for filter
    groupService.getUserGroups(user.id).then(g => {
      if (g) setGroups(g);
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    let q;
    if (filterType === 'all') {
      // Fetch everything the user has paid for across all collections
      q = query(collectionGroup(db, 'expenses'), where('paidBy', '==', user.id), orderBy('date', 'desc'));
    } else if (filterType === 'all_circles') {
      // Fetch everything user paid for, but we'll post-filter for only circles
      q = query(collectionGroup(db, 'expenses'), where('paidBy', '==', user.id), orderBy('date', 'desc'));
    } else if (filterType === 'personal') {
      q = query(collection(db, 'expenses'), where('paidBy', '==', user.id), where('isPersonal', '==', true), orderBy('date', 'desc'));
    } else {
      q = query(collection(db, `groups/${filterType}/expenses`), orderBy('date', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      let filteredExpenses = snap.docs.map(doc => doc.data() as Expense);
      
      // Post-filter for 'all_circles'
      if (filterType === 'all_circles') {
        filteredExpenses = filteredExpenses.filter(e => !!e.groupId);
      }
      
      // Exclude payments/settlements from analytics as they are not spending
      filteredExpenses = filteredExpenses.filter(e => e.category !== Category.Payment);
      
      // Filter by timeframe
      const now = new Date();
      filteredExpenses = filteredExpenses.filter(e => {
        const date = new Date(e.date);
        if (timeframe === 'day') return date.toDateString() === now.toDateString();
        if (timeframe === 'week') {
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          return date >= weekAgo;
        }
        if (timeframe === 'month') {
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }
        if (timeframe === 'year') {
          return date.getFullYear() === now.getFullYear();
        }
        return true;
      });

      setExpenses(filteredExpenses);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setExpenses([]);
      setLoading(false);
    });

    return unsubscribe;
  }, [user, filterType, timeframe]);

  const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  
  const categoryData = Object.values(Category).map((cat, index) => {
    const amount = expenses.filter(e => e.category === cat).reduce((acc, curr) => acc + curr.amount, 0);
    return { name: cat, value: amount, color: PIE_COLORS[index % PIE_COLORS.length] };
  }).filter(c => c.value > 0).sort((a, b) => b.value - a.value);

  // Group by date for line chart
  const timelineData = expenses.reduce((acc: any[], curr) => {
    const dateStr = format(new Date(curr.date), 'MMM d');
    const existing = acc.find(a => a.date === dateStr);
    if (existing) {
      existing.amount += curr.amount;
    } else {
      acc.push({ date: dateStr, amount: curr.amount });
    }
    return acc;
  }, []).reverse();

  const selectedGroupName = filterType === 'all' ? 'All' : filterType === 'all_circles' ? 'All Circles' : filterType === 'personal' ? 'Personal' : groups.find(g => g.id === filterType)?.name || 'Circle';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 pt-8 space-y-8 pb-24">
      <section className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          
          <div className="relative">
            <button 
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 border border-primary/10"
            >
              <Filter className="w-3 h-3" />
              <span>{selectedGroupName}</span>
              <ChevronDown className="w-3 h-3 outline-none" />
            </button>

            {showFilterDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowFilterDropdown(false)} />
                <div className="absolute right-0 mt-2 w-48 glass rounded-2xl shadow-2xl p-2 z-50 border border-white/60">
                  <button 
                    onClick={() => { setFilterType('all'); setShowFilterDropdown(false); }}
                    className={cn("w-full text-left px-4 py-3 text-xs font-bold rounded-xl transition-colors", filterType === 'all' ? "bg-primary text-white" : "hover:bg-primary/5")}
                  >
                    All Expenses
                  </button>
                  <button 
                    onClick={() => { setFilterType('all_circles'); setShowFilterDropdown(false); }}
                    className={cn("w-full text-left px-4 py-3 text-xs font-bold rounded-xl transition-colors", filterType === 'all_circles' ? "bg-primary text-white" : "hover:bg-primary/5")}
                  >
                    All Circles
                  </button>
                  <button 
                    onClick={() => { setFilterType('personal'); setShowFilterDropdown(false); }}
                    className={cn("w-full text-left px-4 py-3 text-xs font-bold rounded-xl transition-colors", filterType === 'personal' ? "bg-primary text-white" : "hover:bg-primary/5")}
                  >
                    Personal
                  </button>
                  <div className="my-1 border-t border-outline/10" />
                  <p className="px-4 py-1 text-[10px] font-bold text-outline uppercase tracking-widest">Circles</p>
                  {groups.map(group => (
                    <button 
                      key={group.id}
                      onClick={() => { setFilterType(group.id); setShowFilterDropdown(false); }}
                      className={cn("w-full text-left px-4 py-3 text-xs font-bold rounded-xl transition-colors", filterType === group.id ? "bg-primary text-white" : "hover:bg-primary/5")}
                    >
                      {group.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="flex flex-col gap-4">
          <div className="flex bg-surface-container-low p-1 rounded-full w-full">
            {['day', 'week', 'month', 'year'].map(t => (
              <button 
                key={t} 
                onClick={() => setTimeframe(t as any)}
                className={cn("flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-full transition-all", timeframe === t ? "bg-white shadow-sm text-primary" : "text-outline")}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="glass p-6 rounded-[32px] relative overflow-hidden bg-gradient-to-br from-white/40 to-primary/5">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
        <div className="relative z-10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">Total {selectedGroupName} Spend</p>
          <h2 className="text-4xl font-bold text-primary tracking-tight">₹{totalSpent.toLocaleString()}</h2>
          <div className="flex items-center gap-2 mt-4 text-secondary font-bold">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs">Based on {expenses.length} records</span>
          </div>
        </div>
      </section>

      <div className="grid gap-6">
        <div className="glass p-6 rounded-[32px] space-y-6">
          <h3 className="text-xl font-bold tracking-tight">Expense Distribution</h3>
          
          <div className="h-64 w-full relative flex items-center justify-center">
            {loading ? (
              <div className="animate-pulse flex flex-col items-center gap-2">
                <div className="w-32 h-32 rounded-full bg-surface-container" />
                <div className="h-4 w-20 bg-surface-container rounded" />
              </div>
            ) : categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    formatter={(value: number) => `₹${value.toLocaleString()}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8 opacity-40">
                <TrendingDown className="w-12 h-12 mb-2" />
                <p className="text-xs font-bold uppercase tracking-widest">No Data Available</p>
              </div>
            )}
            
            {categoryData.length > 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-2xl font-bold">{categoryData.length}</p>
                  <p className="text-[8px] font-bold uppercase text-outline">Categories</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {categoryData.map((i) => (
              <div key={i.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: i.color }} />
                <span className="text-[10px] font-bold text-outline uppercase truncate">{i.name} (₹{i.value.toLocaleString()})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Chart with improved Axes and Labels */}
        <div className="glass p-6 rounded-[32px] space-y-6">
          <h3 className="text-xl font-bold tracking-tight">Spending Timeline</h3>
          <div className="h-64 w-full">
            {loading ? (
              <div className="w-full h-full animate-pulse bg-surface-container rounded-2xl" />
            ) : timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    padding={{ left: 10, right: 10 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickFormatter={(value) => `₹${value >= 1000 ? (value/1000).toFixed(1) + 'k' : value}`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    formatter={(value: number) => `₹${value.toLocaleString()}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#6366f1" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorAmount)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-outline/40 gap-4">
                <TrendingDown className="w-12 h-12" />
                <p className="text-xs font-bold uppercase tracking-widest">No spending data for this period</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
