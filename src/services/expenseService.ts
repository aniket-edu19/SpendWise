import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  runTransaction,
  writeBatch,
  arrayUnion
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Group, Expense, GroupMember, MemberRole, Category, SplitType } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const groupService = {
  createGroup: async (name: string, ownerId: string, initialMembers: { name: string, userId?: string }[] = [], imageURL?: string) => {
    const path = 'groups';
    try {
      const groupRef = doc(collection(db, path));
      const batch = writeBatch(db);
      
      const allMemberIds = [ownerId];

      // Add Creator
      const creatorRef = doc(db, `groups/${groupRef.id}/members`, ownerId);
      const creatorData: Partial<GroupMember> = {
        userId: ownerId,
        name: auth.currentUser?.displayName || 'Owner',
        photoURL: auth.currentUser?.photoURL || null,
        role: MemberRole.Owner,
        balance: 0,
      };
      batch.set(creatorRef, { ...creatorData, joinedAt: serverTimestamp() });

      // Add Initial Members
      initialMembers.forEach(m => {
        const mUserId = m.userId || `member_${Math.random().toString(36).substr(2, 9)}`;
        allMemberIds.push(mUserId);
        const mRef = doc(db, `groups/${groupRef.id}/members`, mUserId);
        const mData: Partial<GroupMember> = {
          userId: mUserId,
          name: m.name,
          photoURL: null,
          role: MemberRole.Member,
          balance: 0,
        };
        batch.set(mRef, { ...mData, joinedAt: serverTimestamp() });
      });

      const groupData: Partial<Group & { memberIds: string[] }> = {
        id: groupRef.id,
        name,
        imageURL: imageURL || null,
        totalBalance: 0,
        ownerId,
        memberIds: allMemberIds
      };

      batch.set(groupRef, { ...groupData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      await batch.commit();

      return groupRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  deleteGroup: async (groupId: string) => {
    const path = `groups/${groupId}`;
    try {
      // Note: This only deletes the doc, not subcollections. In production, we'd need a recursive delete.
      // For this app, simply deleting the group doc might "hide" it from the list if the list depends on it.
      await setDoc(doc(db, path), { deleted: true }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  addMember: async (groupId: string, name: string, userId?: string) => {
    const path = `groups/${groupId}/members`;
    try {
      const mUserId = userId || `member_${Math.random().toString(36).substr(2, 9)}`;
      const mRef = doc(db, path, mUserId);
      const mData: Partial<GroupMember> = {
        userId: mUserId,
        name: name,
        photoURL: null,
        role: MemberRole.Member,
        balance: 0,
      };
      
      const batch = writeBatch(db);
      batch.set(mRef, { ...mData, joinedAt: serverTimestamp() });
      
      // Update memberIds on group doc to ensure they show up in lists
      const groupRef = doc(db, 'groups', groupId);
      batch.update(groupRef, { 
        memberIds: arrayUnion(mUserId),
        updatedAt: serverTimestamp() 
      });
      
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  renameGroup: async (groupId: string, newName: string) => {
    const path = `groups/${groupId}`;
    try {
      await setDoc(doc(db, path), { name: newName, updatedAt: serverTimestamp() }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  updateMemberName: async (groupId: string, userId: string, newName: string) => {
    const path = `groups/${groupId}/members/${userId}`;
    try {
      await setDoc(doc(db, path), { name: newName }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  getGroupDetails: async (groupId: string) => {
    const path = `groups/${groupId}`;
    try {
      const snap = await getDoc(doc(db, path));
      return snap.exists() ? (snap.data() as Group) : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  getMembers: (groupId: string, callback: (members: GroupMember[]) => void) => {
    const path = `groups/${groupId}/members`;
    const q = query(collection(db, path));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => d.data() as GroupMember));
    }, (error) => handleFirestoreError(error, OperationType.LIST, path));
  },

  getUserGroups: async (userId: string) => {
    const path = 'groups';
    try {
      const q = query(collection(db, path), where('memberIds', 'array-contains', userId));
      const snap = await getDocs(q);
      // Filter deleted in memory if necessary, but for now we just return all active ones
      return snap.docs
        .map(d => d.data() as Group)
        .filter(g => !g.deleted);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }
};

export const expenseService = {
  addExpense: async (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    const isGroup = !!expense.groupId;
    const path = isGroup ? `groups/${expense.groupId}/expenses` : 'expenses';
    
    try {
      await runTransaction(db, async (transaction) => {
        // 1. Prepare references
        const expenseRef = doc(collection(db, path));
        const groupRef = isGroup && expense.groupId ? doc(db, 'groups', expense.groupId) : null;
        
        // 2. Perform ALL READS first
        let groupSnap = null;
        const memberSnaps: Record<string, any> = {};

        if (groupRef) {
          groupSnap = await transaction.get(groupRef);
          
          // Get all member snaps involved in splits OR as the payer
          const involvedIds = new Set([...Object.keys(expense.splits), expense.paidBy]);
          for (const userId of involvedIds) {
            const memberRef = doc(db, `groups/${expense.groupId}/members`, userId);
            memberSnaps[userId] = await transaction.get(memberRef);
          }
        }

        // 3. Perform ALL WRITES
        const newExpense = {
          ...expense,
          id: expenseRef.id,
          groupId: expense.groupId || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        transaction.set(expenseRef, newExpense);

        if (groupSnap && groupSnap.exists()) {
          const groupData = groupSnap.data() as Group;
          
          // Only update group total for normal expenses, not settle-ups
          if (expense.category !== Category.Payment) {
            const currentTotal = groupData.totalBalance || 0;
            transaction.update(groupRef!, { 
              totalBalance: currentTotal + expense.amount, 
              updatedAt: serverTimestamp() 
            });
          }

          // Update member balances based on split
          const involvedIds = new Set([...Object.keys(expense.splits), expense.paidBy]);
          for (const userId of involvedIds) {
            const memberSnap = memberSnaps[userId];
            if (memberSnap && memberSnap.exists()) {
              const memberData = memberSnap.data() as GroupMember;
              const currentBalance = memberData.balance || 0;
              const memberRef = doc(db, `groups/${expense.groupId}/members`, userId);
              
              const userSplit = expense.splits[userId] || 0;
              
              if (userId === expense.paidBy) {
                // Payer balance increases by what they lent (Total - theirSplit)
                transaction.update(memberRef, { balance: currentBalance + (expense.amount - userSplit) });
              } else {
                // Debtor balance decreases by their split
                transaction.update(memberRef, { balance: currentBalance - userSplit });
              }
            }
          }
        }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  updateExpense: async (oldExpense: Expense, updatedFields: Partial<Expense>) => {
    const isGroup = !!oldExpense.groupId;
    const path = isGroup ? `groups/${oldExpense.groupId}/expenses` : 'expenses';
    const expenseRef = doc(db, path, oldExpense.id);
    const groupRef = isGroup && oldExpense.groupId ? doc(db, 'groups', oldExpense.groupId) : null;

    try {
      await runTransaction(db, async (transaction) => {
        const newExpense = { ...oldExpense, ...updatedFields };
        
        // 1. Prepare references for ALL involved members (old and new)
        const allMemberIds = new Set([
          oldExpense.paidBy, ...Object.keys(oldExpense.splits),
          newExpense.paidBy, ...Object.keys(newExpense.splits)
        ]);
        
        const memberSnaps: Record<string, any> = {};
        for (const userId of allMemberIds) {
          if (oldExpense.groupId) {
            const memberRef = doc(db, `groups/${oldExpense.groupId}/members`, userId);
            memberSnaps[userId] = await transaction.get(memberRef);
          }
        }

        let groupSnap = null;
        if (groupRef) {
          groupSnap = await transaction.get(groupRef);
        }

        // 2. Perform WRITES
        
        // Update expense doc
        transaction.update(expenseRef, { ...updatedFields, updatedAt: serverTimestamp() });

        if (groupSnap && groupSnap.exists()) {
          const groupData = groupSnap.data() as Group;
          let netGroupBalanceChange = 0;
          
          // Revert old total
          if (oldExpense.category !== Category.Payment) {
            netGroupBalanceChange -= oldExpense.amount;
          }
          // Add new total
          if (newExpense.category !== Category.Payment) {
            netGroupBalanceChange += newExpense.amount;
          }

          if (netGroupBalanceChange !== 0) {
            transaction.update(groupRef!, { 
              totalBalance: (groupData.totalBalance || 0) + netGroupBalanceChange,
              updatedAt: serverTimestamp()
            });
          }

          // Update member balances
          for (const userId of allMemberIds) {
            const memberSnap = memberSnaps[userId];
            if (memberSnap && memberSnap.exists()) {
              const memberData = memberSnap.data() as GroupMember;
              let netMemberBalanceChange = 0;

              // Reverse old impact
              const oldUserSplit = oldExpense.splits[userId] || 0;
              if (userId === oldExpense.paidBy) {
                netMemberBalanceChange -= (oldExpense.amount - oldUserSplit);
              } else {
                netMemberBalanceChange += oldUserSplit;
              }

              // Apply new impact
              const newUserSplit = newExpense.splits[userId] || 0;
              if (userId === newExpense.paidBy) {
                netMemberBalanceChange += (newExpense.amount - newUserSplit);
              } else {
                netMemberBalanceChange -= newUserSplit;
              }

              if (netMemberBalanceChange !== 0) {
                const memberRef = doc(db, `groups/${oldExpense.groupId}/members`, userId);
                transaction.update(memberRef, { balance: (memberData.balance || 0) + netMemberBalanceChange });
              }
            }
          }
        }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  getRecentExpenses: (limitCount: number = 10, groupId?: string) => {
    const path = groupId ? `groups/${groupId}/expenses` : 'expenses';
    const q = query(collection(db, path), orderBy('date', 'desc'));
    return q; // Component will handle the snap
  },

  deleteExpense: async (expense: Expense) => {
    const isGroup = !!expense.groupId;
    const path = isGroup ? `groups/${expense.groupId}/expenses` : 'expenses';
    const expenseRef = doc(db, path, expense.id);
    const groupRef = isGroup && expense.groupId ? doc(db, 'groups', expense.groupId) : null;

    try {
      await runTransaction(db, async (transaction) => {
        // 1. Prepare references for involved members
        const involvedIds = new Set([expense.paidBy, ...Object.keys(expense.splits)]);
        const memberSnaps: Record<string, any> = {};
        for (const userId of involvedIds) {
          if (expense.groupId) {
             const memberRef = doc(db, `groups/${expense.groupId}/members`, userId);
             memberSnaps[userId] = await transaction.get(memberRef);
          }
        }

        let groupSnap = null;
        if (groupRef) {
          groupSnap = await transaction.get(groupRef);
        }

        // 2. Perform WRITES
        transaction.delete(expenseRef);

        if (groupSnap && groupSnap.exists()) {
          const groupData = groupSnap.data() as Group;
          
          // Revert group total only for non-settlements
          if (expense.category !== Category.Payment) {
            transaction.update(groupRef!, { 
              totalBalance: Math.max(0, (groupData.totalBalance || 0) - expense.amount),
              updatedAt: serverTimestamp()
            });
          }

          // Revert member balances
          for (const userId of involvedIds) {
            const memberSnap = memberSnaps[userId];
            if (memberSnap && memberSnap.exists()) {
              const memberData = memberSnap.data() as GroupMember;
              const userSplit = expense.splits[userId] || 0;
              const memberRef = doc(db, `groups/${expense.groupId}/members`, userId);
              
              if (userId === expense.paidBy) {
                // Remove the money they lent (Total - theirSplit)
                transaction.update(memberRef, { balance: (memberData.balance || 0) - (expense.amount - userSplit) });
              } else {
                // Add back the money they owed (their split)
                transaction.update(memberRef, { balance: (memberData.balance || 0) + userSplit });
              }
            }
          }
        }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
};
