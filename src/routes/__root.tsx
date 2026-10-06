import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { ChefHat, ClipboardList, LayoutGrid, BarChart3, Settings as SettingsIcon, WalletCards } from "lucide-react";
import textLogo from "@/assets/kf-text-logo.png.asset.json";

import appCss from "../styles.css?url";
import { registerServiceWorker } from "../lib/pwa";
import { InstallButton } from "../components/InstallButton";
import { Toaster } from "@/components/ui/sonner";
import { setLang, startDomTranslation, useLang } from "@/lib/i18n";

function LangToggle() {
  const lang = useLang();
  return (
    <div className="flex rounded-full border border-border p-0.5 text-xs font-bold" role="group" aria-label="Language">
      {(["en", "fr"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={`rounded-full px-2.5 py-1 ${lang === l ? "bg-primary text-primary-foreground" : "text-foreground"}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Back to POS
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    console.error("Kings Food POS route error", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Try again or go back home.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Kings Food — Restaurant POS" },
      { name: "description", content: "Restaurant ordering, kitchen and POS for Kings Food Yaoundé. Works offline." },
      { name: "theme-color", content: "#d9480f" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Kings Food" },
      { property: "og:title", content: "Kings Food — Restaurant POS" },
      { property: "og:description", content: "Restaurant ordering, kitchen and POS for Kings Food Yaoundé. Works offline." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const NAV = [
  { to: "/", label: "POS", icon: ClipboardList },
  { to: "/kitchen", label: "Kitchen", icon: ChefHat },
  { to: "/menu", label: "Menu", icon: LayoutGrid },
  { to: "/sales", label: "Sales", icon: BarChart3 },
  { to: "/spending", label: "Spending", icon: WalletCards },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    registerServiceWorker();
    return startDomTranslation(document.body);
  }, []);

  return (
    <>
      <HeadContent />
      <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col bg-background">
        <div className="flag-stripe no-print" />
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur no-print">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
            <Link to="/" className="flex items-center gap-2">
              <img src="/icons/kf-mark.png" alt="Kings Food" width={44} height={44} className="size-11 object-contain" />
              <img src={textLogo.url} alt="Kings Food" width={120} height={44} className="h-8 w-auto" />
            </Link>
            <nav className="hidden md:block">
              <ul className="flex gap-1">
                {NAV.map(({ to, label, icon: Icon }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      activeOptions={{ exact: to === "/" }}
                      activeProps={{ className: "bg-primary text-primary-foreground" }}
                      inactiveProps={{ className: "text-foreground hover:bg-muted" }}
                      className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors"
                    >
                      <Icon className="size-4" />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="flex items-center gap-2">
              <LangToggle />
              <InstallButton />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-5 pb-28 md:pb-10">
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden no-print">
          <ul className="grid grid-cols-6">
            {NAV.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  activeOptions={{ exact: to === "/" }}
                  activeProps={{ className: "text-primary" }}
                  inactiveProps={{ className: "text-muted-foreground" }}
                  className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-semibold transition-colors"
                >
                  <Icon className="size-5" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
        <Toaster position="top-center" />
      </QueryClientProvider>
    </>
  );
}
