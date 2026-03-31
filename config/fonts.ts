import {
  Cormorant_Garamond as FontDisplay,
  IBM_Plex_Mono as FontMono,
  IBM_Plex_Sans as FontSans,
} from "next/font/google";

export const fontSans = FontSans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
});

export const fontDisplay = FontDisplay({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-display",
});

export const fontMono = FontMono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
});
