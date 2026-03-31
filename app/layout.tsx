import "@/styles/globals.css";
import { Metadata, Viewport } from "next";
import clsx from "clsx";

import { Navbar } from "@/components/navbar";
import { siteConfig } from "@/config/site";
import { fontDisplay, fontSans } from "@/config/fonts";

import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f1ea" },
    { media: "(prefers-color-scheme: dark)", color: "#101418" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="en">
      <head />
      <body
        className={clsx(
          "min-h-screen font-sans antialiased",
          fontSans.variable,
          fontDisplay.variable
        )}
      >
        <Providers themeProps={{ attribute: "class", defaultTheme: "light" }}>
          <div className="relative flex min-h-screen flex-col">
            <Navbar />
            <main className="container mx-auto flex w-full max-w-[1500px] flex-1 px-4 pb-8 pt-4 sm:px-5 sm:pb-10 sm:pt-5 lg:px-6">
              {children}
            </main>
            <footer className="px-4 pb-4 sm:px-5">
              <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-4 border-t border-black/[0.08] pt-3 text-[0.68rem] uppercase tracking-[0.22em] text-[#74685d] dark:border-white/10 dark:text-[#9ba5ad]">
                <p>CB</p>
                <p>{siteConfig.name}</p>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
