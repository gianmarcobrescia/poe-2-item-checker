'use client';

import { Footer } from "./Footer";

export function Providers({ children }: { children: React.ReactNode }) {

  return (
    <>
      <div className="flex-1">
        {children}
      </div>
      <Footer />
    </>
  );
}
