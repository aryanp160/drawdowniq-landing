import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User,
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  AuthProvider as FirebaseAuthProvider // alias to avoid naming conflict
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';

export interface UserProfile {
  uid: string;
  email: string | null;
  plan: 'free' | 'signals' | 'trader' | 'elite';
  subscriptionStatus: 'active' | 'inactive';
  expiresAt: any;
  createdAt: any;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (e: string, p: string) => Promise<void>;
  signupWithEmail: (e: string, p: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch or create profile
        const userRef = doc(db, 'users', user.uid);
        const unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
            setLoading(false);
          } else {
            // Create default free profile
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email,
              plan: 'free',
              subscriptionStatus: 'inactive',
              expiresAt: null,
              createdAt: serverTimestamp(),
            };
            setDoc(userRef, newProfile).then(() => {
              setUserProfile(newProfile);
              setLoading(false);
            });
          }
        });
        return () => unsubscribeProfile();
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const loginWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signupWithEmail = async (email: string, pass: string) => {
    await createUserWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    loginWithGoogle,
    loginWithEmail,
    signupWithEmail,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : (
        <div className="min-h-screen bg-background noise-overlay flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <span className="w-3 h-3 rounded-full bg-primary animate-pulse" />
            <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              Initializing Terminal...
            </span>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};
