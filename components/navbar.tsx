import {
  Navbar as NextUINavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
} from "@nextui-org/navbar";
import NextLink from "next/link";

import { Logo } from "@/components/icons";
import { ThemeSwitch } from "@/components/theme-switch";

export const Navbar = () => {
  return (
    <NextUINavbar
      maxWidth="xl"
      position="sticky"
      className="border-b border-black/5 bg-[rgba(245,241,234,0.88)] backdrop-blur-lg dark:border-white/10 dark:bg-[rgba(16,20,24,0.9)]"
    >
      <NavbarContent className="basis-full" justify="start">
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
      </NavbarContent>

      <NavbarContent justify="end">
        <NavbarItem>
          <ThemeSwitch className="rounded-full border border-black/10 bg-white/80 p-2 shadow-sm dark:border-white/10 dark:bg-white/5" />
        </NavbarItem>
      </NavbarContent>
    </NextUINavbar>
  );
};
