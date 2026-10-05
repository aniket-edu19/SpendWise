export enum Category {
  Food = 'Food',
  Travel = 'Travel',
  Shopping = 'Shopping',
  Health = 'Health',
  Fun = 'Fun',
  Income = 'Income',
  Payment = 'Payment',
  Other = 'Other'
}

export enum SplitType {
  Equal = 'equal',
  Percentage = 'percentage',
  Amount = 'amount'
}

export enum MemberRole {
  Owner = 'owner',
  Member = 'member'
}

export interface User {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  gender?: 'male' | 'female' | 'other';
  hasCompletedSetup?: boolean;
  currency: string;
  isGoldMember: boolean;
  planExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  name: string;
  imageURL?: string | null;
  totalBalance: number;
  ownerId: string;
  memberIds?: string[];
  createdAt: string;
  updatedAt: string;
  deleted?: boolean;
}

export interface GroupMember {
  userId: string;
  name: string;
  photoURL?: string;
  role: MemberRole;
  balance: number;
  joinedAt: string;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: Category;
  date: string;
  paidBy: string;
  groupId?: string;
  isPersonal: boolean;
  splitType: SplitType;
  splits: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}
