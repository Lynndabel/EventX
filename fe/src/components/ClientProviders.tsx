'use client';

import { ReactNode } from 'react';
import { PushUniversalWalletProvider, PushUI } from '@pushchain/ui-kit';

interface ClientProvidersProps {
  children: ReactNode;
}

export default function ClientProviders({ children }: ClientProvidersProps) {
  const walletConfig = {
    network: PushUI.CONSTANTS.PUSH_NETWORK.TESTNET,
    login: {
      email: true,
      google: true,
      wallet: { enabled: true },
      appPreview: true,
    },
    modal: {
      loginLayout: PushUI.CONSTANTS.LOGIN.LAYOUT.SPLIT,
      connectedLayout: PushUI.CONSTANTS.CONNECTED.LAYOUT.HOVER,
      appPreview: true,
    },
  } as const;

  const appMetadata = {
    logoUrl: '/logo.png',
    title: 'EventX',
    description: 'Decentralized event tickets on Push Testnet Donut',
  } as const;

  return (
    <PushUniversalWalletProvider config={walletConfig} app={appMetadata}>
      {children}
    </PushUniversalWalletProvider>
  );
}
