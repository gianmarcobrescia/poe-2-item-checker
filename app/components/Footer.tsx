import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full border-t border-white/10 bg-card/50 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
        <p className="text-sm text-white/60">
          © {new Date().getFullYear()} All rights reserved.
        </p>
      </div>
    </footer>
  );
}
