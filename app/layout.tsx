import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AuthRecoveryRedirect from "@/components/auth/AuthRecoveryRedirect";
import MainHeader from "@/components/MainHeader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Olivetti Score",
    template: "%s | Olivetti Score",
  },
  description:
    "Resultados, prognósticos, apostas de pontos e estatísticas de futebol em tempo real.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-PT"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <AuthRecoveryRedirect />
        <MainHeader />
        {children}
      </body>
    </html>
  );
}
