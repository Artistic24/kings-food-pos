import { Capacitor, registerPlugin } from "@capacitor/core";

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

export interface KingsFoodAuthPlugin {
  signInWithGoogle(options: { serverClientId: string }): Promise<GoogleAccount>;
}

export const KingsFoodAuth = registerPlugin<KingsFoodAuthPlugin>("KingsFoodAuth");

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
    const serverClientId = String(import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID || "").trim();
    const account = await KingsFoodAuth.signInWithGoogle({ serverClientId });
    saveStoredAccount(account);
    return account;
  }

  throw new Error("Google account sign-in is currently implemented natively for the Android app.");
}
