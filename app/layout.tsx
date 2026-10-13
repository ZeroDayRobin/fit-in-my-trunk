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

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ecedef" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0c0f" },
  ],
};

// Setzt das Farbschema vor dem ersten Paint (kein Aufblitzen beim Laden).
const themeScript = `try{var t=localStorage.getItem("trunk-theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${geist.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
