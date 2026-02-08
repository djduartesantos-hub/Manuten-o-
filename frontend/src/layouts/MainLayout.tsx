import React from 'react';
import { Header } from '../components/Header';

interface MainLayoutProps {
  children: React.ReactNode;
  wide?: boolean;
}

export function MainLayout({ children, wide = false }: MainLayoutProps) {
  return (
    <div className="min-h-screen theme-bg theme-text">
      <Header />
      <main
        className={
          wide ? 'mx-auto w-full max-w-[98rem] px-4 py-6' : 'container-custom'
        }
      >
        {children}
      </main>
    </div>
  );
}
