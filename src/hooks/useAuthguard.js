import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../pages/firebase";
import { onAuthStateChanged } from "firebase/auth";

export function useAuthGuard(enabled = true) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        navigate("/login", { replace: true });
      }
    });

    return () => unsubscribe();
  }, [enabled, navigate]);
}