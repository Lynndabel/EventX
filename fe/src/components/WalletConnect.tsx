'use client';

import { useEffect, useMemo } from 'react';
import { PushUniversalAccountButton, usePushWalletContext, usePushChainClient, PushUI } from '@pushchain/ui-kit';

interface WalletConnectProps {
  onConnect?: (address: string) => void;
}

export default function WalletConnect({ onConnect }: WalletConnectProps) {
  const { connectionStatus } = usePushWalletContext();
  const { pushChainClient } = usePushChainClient();

  const address = useMemo(() => {
    // Universal account can represent EVM or Solana depending on chain selection
    return pushChainClient?.universal?.account || '';
  }, [pushChainClient]);

  useEffect(() => {
    if (connectionStatus === PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED && address) {
      onConnect?.(address);
    } else if (connectionStatus !== PushUI.CONSTANTS.CONNECTION.STATUS.CONNECTED) {
      onConnect?.('');
    }
  }, [connectionStatus, address, onConnect]);

  return (
    <div className="flex flex-col items-end">
      <PushUniversalAccountButton />
    </div>
  );
}
