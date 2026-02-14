import React from 'react';
import { Header } from '../components/Header';
import { SidebarNav } from '../components/SidebarNav';

interface MainLayoutProps {
  children: React.ReactNode;
  wide?: boolean;
}

export function MainLayout({ children, wide = false }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="min-h-screen theme-bg theme-text">
      <div className="relative flex">
        <SidebarNav open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="min-w-0 flex-1 lg:pl-[280px]">
          <Header onToggleSidebar={() => setSidebarOpen((v) => !v)} />
          <main
            className={
              wide ? 'mx-auto w-full max-w-[98rem] px-4 py-6' : 'container-custom'
            }
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
