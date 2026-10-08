import { useEffect, useState } from "react";
import { LogOut, X } from "lucide-react";
import { toast } from "sonner";

import {
  clearStoredAccount,
  getStoredAccount,
  signInWithGoogle,
  type GoogleAccount,
} from "@/lib/auth";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

type AuthSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccountChange?: (account: GoogleAccount | null) => void;
};

function GoogleMark() {
  return (
    <span aria-hidden="true" className="inline-flex size-7 items-center justify-center rounded-full bg-white font-bold text-base shadow-sm">
      <span className="bg-[conic-gradient(from_-45deg,#4285f4_0_25%,#34a853_25%_50%,#fbbc05_50%_75%,#ea4335_75%_100%)] bg-clip-text text-transparent">G</span>
    </span>
  );
}

export function AuthSheet({ open, onOpenChange, onAccountChange }: AuthSheetProps) {
  const [account, setAccount] = useState<GoogleAccount | null>(() => getStoredAccount());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setAccount(getStoredAccount());
  }, [open]);

  const continueWithGoogle = async () => {
    setBusy(true);
    try {
      const next = await signInWithGoogle();
      setAccount(next);
      onAccountChange?.(next);
      toast.success(`Signed in as ${next.email}`);
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google sign-in could not be completed.";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    clearStoredAccount();
    await window.kingsFoodAuth?.signOutGoogle?.();
    setAccount(null);
    onAccountChange?.(null);
    toast.success("Signed out");
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[88vh] rounded-t-[28px] bg-background px-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <DrawerHeader className="relative px-6 pb-2 pt-5 text-center">
          <DrawerClose asChild>
            <button
              type="button"
              aria-label="Close"
              className="absolute right-5 top-4 inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <X className="size-5" />
            </button>
          </DrawerClose>
          <DrawerTitle className="font-display text-3xl font-normal tracking-tight">
            {account ? "Your account" : "Log in or sign up"}
          </DrawerTitle>
          <DrawerDescription className="mx-auto mt-2 max-w-md text-sm leading-6">
            {account
              ? "Your Kings Food profile is available on this device."
              : "Use your Google account to sign in or create your Kings Food profile without leaving the app."}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-6 pb-7 pt-3">
          {account ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
                {account.profilePictureUrl ? (
                  <img src={account.profilePictureUrl} alt="" className="size-12 rounded-full object-cover" />
                ) : (
                  <div className="flex size-12 items-center justify-center rounded-full bg-muted font-display text-lg font-bold">
                    {(account.displayName || account.email).slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-semibold">{account.displayName || account.email}</p>
                  <p className="truncate text-sm text-muted-foreground">{account.email}</p>
                </div>
              </div>
              <Button variant="outline" className="h-12 w-full rounded-full" onClick={() => void signOut()}>
                <LogOut className="size-4" /> Sign out
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Button
                type="button"
                disabled={busy}
                onClick={() => void continueWithGoogle()}
                className="h-14 w-full rounded-full border border-border bg-white px-5 text-base font-semibold text-foreground shadow-sm hover:bg-white"
              >
                <GoogleMark />
                <span>{busy ? "Connecting to Google…" : "Continue with Google"}</span>
              </Button>

              <p className="text-center text-xs leading-5 text-muted-foreground">
                On Android, Google uses the system Credential Manager. The account selector appears as a native bottom sheet inside the app instead of redirecting to a browser.
              </p>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
