import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "700"],
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Lesson Search — ask the course anything",
  description:
    "Ask questions about your course and get answers with the exact lesson and timestamp they came from.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
    appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#C9A8FF",
          colorBackground: "#12151C",
          colorInputBackground: "#0B0E14",
          colorInputText: "#ECEEF2",
          colorText: "#ECEEF2",
          colorTextSecondary: "#8A8FA3",
          colorNeutral: "#8A8FA3",
          borderRadius: "0.85rem",
        },
      }}
    >
      <html lang="en" className="dark">
        <body
          className={`${display.variable} ${body.variable} ${mono.variable} font-sans bg-base text-primary antialiased`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
