import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kofferraum-Simulator – Passt mein Gepäck rein?",
  description:
    "Interaktiver 3D-Kofferraum-Pack-Simulator: Fahrzeug wählen, Gepäck per Drag & Drop einladen und sofort sehen, ob alles passt.",
};

// Die Seite startet immer im hellen Design (dunkel nur per Umschalter)
export const viewport: Viewport = {
  themeColor: "#e3e5e8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${geist.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
