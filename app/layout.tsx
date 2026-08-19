import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mezon English Placement Exam',
  description: 'Evaluate your CEFR English level and join the Mezon English Clan community!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
