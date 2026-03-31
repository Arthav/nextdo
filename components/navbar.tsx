"use client";

import {
  Navbar as NextUINavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
} from "@nextui-org/navbar";
import clsx from "clsx";
import NextLink from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/icons";
import { BackupControls } from "@/components/BackupControls";
import { ThemeSwitch } from "@/components/theme-switch";
import { siteConfig } from "@/config/site";

export const Navbar = () => {
  const pathname = usePathname();

  return (
    <NextUINavbar
      maxWidth="xl"
      position="sticky"
      className="border-b border-black/5 bg-[rgba(245,241,234,0.88)] backdrop-blur-lg dark:border-white/10 dark:bg-[rgba(16,20,24,0.9)]"
    >
      <NavbarContent className="basis-full gap-4" justify="start">
        <NavbarBrand as="li" className="max-w-fit gap-3">
          <NextLink className="flex items-center gap-3" href="/">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white/80 text-[#1f1a16] dark:border-white/10 dark:bg-white/5 dark:text-[#eef1f3]">
              <Logo size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight text-[#1f1a16] dark:text-[#eef1f3]">
                Nextdo
              </p>
              <p className="text-[0.62rem] uppercase tracking-[0.22em] text-[#74685d] dark:text-[#9ba5ad]">
                Today&apos;s planner
              </p>
            </div>
          </NextLink>
        </NavbarBrand>

        <div className="hidden items-center gap-2 sm:flex">
          {siteConfig.navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <NextLink
                key={item.href}
                href={item.href}
                className={clsx(
                  "rounded-full px-3 py-1.5 text-sm transition",
                  isActive
                    ? "bg-[#1f1a16] text-white dark:bg-[#eef1f3] dark:text-[#101418]"
                    : "text-[#74685d] hover:bg-black/[0.04] hover:text-[#1f1a16] dark:text-[#9ba5ad] dark:hover:bg-white/[0.06] dark:hover:text-[#eef1f3]"
                )}
              >
                {item.label}
              </NextLink>
            );
          })}
        </div>
      </NavbarContent>

      <NavbarContent className="gap-2" justify="end">
        <NavbarItem>
          <BackupControls />
        </NavbarItem>
        <NavbarItem className="sm:hidden">
          <NextLink
            href={pathname.startsWith("/project-managing") ? "/" : "/project-managing"}
            className="rounded-full border border-black/10 bg-white/80 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[#1f1a16] dark:border-white/10 dark:bg-white/5 dark:text-[#eef1f3]"
          >
            {pathname.startsWith("/project-managing") ? "Todo" : "Projects"}
          </NextLink>
        </NavbarItem>
        <NavbarItem>
          <ThemeSwitch className="rounded-full border border-black/10 bg-white/80 p-2 shadow-sm dark:border-white/10 dark:bg-white/5" />
        </NavbarItem>
      </NavbarContent>
    </NextUINavbar>
  );
};
