import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  signInGuest: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);
      if (fUser) {
        // Fetch or create app user in Firestore
        const userRef = doc(db, 'users', fUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setUser(userSnap.data() as User);
        } else {
          const isGoogleUser = fUser.providerData.some(p => p.providerId === 'google.com');
          const newUser: Partial<User> = {
            id: fUser.uid,
            name: fUser.displayName || 'Guest',
            email: fUser.email || '',
            photoURL: fUser.photoURL || '',
            currency: '₹',
            isGoldMember: false,
            // Skip setup if they already have info from Google
            hasCompletedSetup: !!(isGoogleUser && fUser.displayName && fUser.photoURL),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await setDoc(userRef, {
            ...newUser,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          setUser(newUser as User);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error("Error signing in with email", error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error("Error signing up with email", error);
      throw error;
    }
  };

  const signInGuest = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Error signing in as guest", error);
      throw error;
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!firebaseUser) return;
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const updateData = {
        ...data,
        updatedAt: serverTimestamp(),
      };
      await setDoc(userRef, updateData, { merge: true });
      setUser(prev => prev ? { ...prev, ...data } : null);
    } catch (error) {
      console.error("Error updating profile", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signInGuest, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
