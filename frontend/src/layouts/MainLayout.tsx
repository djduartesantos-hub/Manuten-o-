import React from 'react';
import { Header } from '../components/Header';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container-custom">
        {children}
      </main>
    </div>
  );
}
