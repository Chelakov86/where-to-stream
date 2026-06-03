import React from 'react';

const Header = () => {
  return (
    <header className="border-b border-white/10 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-md border border-accent-primary/40 bg-accent-primary/10 text-sm font-black text-accent-primary shadow-[0_0_24px_rgba(246,185,75,0.16)]">
            W
          </div>
          <div>
            <p className="text-base font-black tracking-normal text-text sm:text-lg">
              WhereToStream
            </p>
            <p className="hidden text-xs font-medium uppercase tracking-[0.18em] text-text-secondary sm:block">
              Movie and series lookup
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary md:flex">
          <span className="h-2 w-2 rounded-full bg-accent-secondary shadow-[0_0_12px_rgba(83,210,198,0.8)]" />
          Live availability
        </div>
      </div>
    </header>
  );
};

export default Header;
