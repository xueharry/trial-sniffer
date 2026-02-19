import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrialSniffer",
  description: "Sniff out insights from Datadog trial organization data",
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
