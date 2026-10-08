import { Capacitor } from "@capacitor/core";

export type GoogleAccount = {
  provider: "google";
  uniqueId: string;
  email: string;
  displayName: string;
  givenName?: string;
  familyName?: string;
  profilePictureUrl?: string;
};

const STORAGE_KEY = "kings-food-google-account-v1";

declare global {
  interface Window {
    kingsFoodAuth?: {
      isAvailable: boolean;
      signInWithGoogle: (options?: { serverClientId?: string }) => Promise<GoogleAccount>;
      signOutGoogle?: () => Promise<void>;
    };
  }
}

export function getStoredAccount(): GoogleAccount | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GoogleAccount) : null;
  } catch {
    return null;
  }
}

export function saveStoredAccount(account: GoogleAccount) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
}

export function clearStoredAccount() {
  localStorage.removeItem(STORAGE_KEY);
}

export async function signInWithGoogle(): Promise<GoogleAccount> {
  if (Capacitor.getPlatform() === "android" && Capacitor.isNativePlatform()) {
    const bridge = window.kingsFoodAuth;
    if (!bridge?.isAvailable) {
      throw new Error("Google Sign-In is not available in this Android build.");
    }
    const serverClientId = String(import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID || "").trim();
    const account = await bridge.signInWithGoogle({ serverClientId });
    saveStoredAccount(account);
    return account;
  }

  throw new Error("Google account sign-in is currently implemented natively for the Android app.");
}
