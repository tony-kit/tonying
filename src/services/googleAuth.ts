import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => {
  provider.addScope(scope);
});

// Prompt consent to ensure refresh & access tokens are properly issued
provider.setCustomParameters({
  prompt: 'select_account',
});

// Flag to indicate ongoing sign-in
let isSigningIn = false;
// Cached access token in memory ONLY (never written to localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
}

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    cachedUser = user;
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // User is recognized by Firebase Auth session, but we need fresh OAuth token for Sheets/Drive
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('ไม่สามารถดึง Access Token จาก Google Sign-In ได้ กรุณาลองใหม่อีกครั้ง');
    }

    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    const errorCode = error?.code || '';
    
    // User intentionally closed the popup or cancelled the sign-in prompt
    if (
      errorCode === 'auth/popup-closed-by-user' ||
      errorCode === 'auth/cancelled-popup-request' ||
      errorCode === 'auth/user-cancelled'
    ) {
      // Gracefully return null without treating it as an application crash
      return null;
    }

    if (errorCode === 'auth/popup-blocked') {
      throw new Error('เบราว์เซอร์บล็อกหน้าต่างป๊อปอัปเข้าสู่ระบบ กรุณาอนุญาตป๊อปอัปหรือเปิดใช้งานในหน้าต่างใหม่');
    }

    if (errorCode === 'auth/network-request-failed') {
      throw new Error('การเชื่อมต่อเครือข่ายขัดข้อง กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง');
    }

    if (errorCode === 'auth/unauthorized-domain') {
      throw new Error('โดเมนนี้ยังไม่ได้รับอนุญาตใน Firebase Auth กรุณาตรวจสอบการตั้งค่า Firebase');
    }

    console.warn('Google Sign-In warning:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getCurrentUser = (): User | null => {
  return cachedUser || auth.currentUser;
};

export const logout = async (): Promise<void> => {
  try {
    await signOut(auth);
  } finally {
    cachedAccessToken = null;
    cachedUser = null;
  }
};
