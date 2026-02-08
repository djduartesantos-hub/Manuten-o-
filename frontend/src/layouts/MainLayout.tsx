import React from 'react';
import { Header } from '../components/Header';
import { ThemeProvider } from '../context/ThemeContext';

interface MainLayoutProps {
  children: React.ReactNode;
  wide?: boolean;
}

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main
          className={
            wide ? 'mx-auto w-full max-w-[98rem] px-4 py-6' : 'container-custom'
          }
        >
          {children}
        </main>
      </div>
    </ThemeProvider>
  );
}
