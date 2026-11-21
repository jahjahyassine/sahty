'use client';

import { createContext, useContext, type ReactNode } from 'react';

const DemoSessionContext = createContext<string | null>(null);

export function DemoSessionProvider({
  userId,
  children,
}: {
  userId: string | null;
  children: ReactNode;
}) {
  return <DemoSessionContext.Provider value={userId}>{children}</DemoSessionContext.Provider>;
}

export function useDemoUserId() {
  return useContext(DemoSessionContext);
}
