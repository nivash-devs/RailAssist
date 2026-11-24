"use client";

import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { getFirebase } from "@/lib/firebase";

/** Who is signed in. `ready` is false until Firebase has told us. */
export function useAccount() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fb = getFirebase();
    if (!fb) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- no Firebase config: work on this device only
      setReady(true);
      return;
    }
    setEnabled(true);
    return onAuthStateChanged(fb.auth, (u) => {
      setUser(u);
      setReady(true);
    });
  }, []);

  /** Google sign-in. It also creates the account the first time. Returns false if the person just closed the window. */
  const signIn = async (): Promise<boolean> => {
    const fb = getFirebase();
    if (!fb) throw new Error("Firebase is not configured");
    try {
      await signInWithPopup(fb.auth, new GoogleAuthProvider());
      return true;
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return false;
      throw e;
    }
  };

  const signOut = async () => {
    const fb = getFirebase();
    if (fb) await firebaseSignOut(fb.auth);
  };

  return { user, ready, enabled, signIn, signOut };
}
