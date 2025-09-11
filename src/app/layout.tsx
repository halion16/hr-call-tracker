import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Sidebar } from "@/components/layout/sidebar";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { CalendarSyncProvider } from "@/components/providers/calendar-sync-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HR Call Tracker",
  description: "Sistema di tracciamento call HR per recap dipendenti",
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: '#020817' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <NotificationProvider>
            <CalendarSyncProvider>
              <div className="flex h-screen bg-background">
                <Sidebar />
                <main className="flex-1 overflow-y-auto bg-background">
                  <div className="p-6">
                    {children}
                  </div>
                </main>
              </div>
              <Toaster 
                position="top-right" 
                richColors 
                closeButton 
                duration={4000}
              />
            </CalendarSyncProvider>
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
