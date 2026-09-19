import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "BountyOS — Bug Bounty AI Research OS",
  description:
    "An operating system for authorized bug bounty research. Authorized only, scope first, minimum impact, human control.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Sidebar />
        <main className="ml-60 min-h-screen px-8 py-8">{children}</main>
      </body>
    </html>
  );
}
