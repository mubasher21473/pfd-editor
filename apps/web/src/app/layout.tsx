import "@/styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PDF Object Editor",
  description: "Edit PDF internals safely at object level"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
