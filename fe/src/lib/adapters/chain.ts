// Chain adapter scaffold for multi-chain support (EVM now, Solana later)
// Keep this minimal and non-breaking; wire EVM to existing flows and leave Solana as TODO.

export type ChainKind = 'evm' | 'solana';

export interface ChainAdapterContext {
  // For EVM, this is the universal account or EVM address
  address?: string;
  // Chain identifiers
  chainId?: number; // EVM
  cluster?: 'devnet' | 'mainnet-beta' | 'testnet'; // Solana
}

export interface ChainAdapter {
  kind: ChainKind;
  canTransact(ctx: ChainAdapterContext): boolean;
  getAddress(ctx: ChainAdapterContext): string | undefined;
  // Generic placeholder: concrete apps should expose typed methods
  // For now, we do not define EVM/Solana transaction signatures here.
}

export class EvmAdapter implements ChainAdapter {
  kind: ChainKind = 'evm';
  private requiredChainId: number;

  constructor(requiredChainId: number) {
    this.requiredChainId = requiredChainId;
  }

  canTransact(ctx: ChainAdapterContext): boolean {
    return !!ctx.address && ctx.chainId === this.requiredChainId;
  }

  getAddress(ctx: ChainAdapterContext): string | undefined {
    return ctx.address;
  }
}

export class SolanaAdapter implements ChainAdapter {
  kind: ChainKind = 'solana';
  private requiredCluster: ChainAdapterContext['cluster'];

  constructor(cluster: ChainAdapterContext['cluster'] = 'devnet') {
    this.requiredCluster = cluster;
  }

  canTransact(ctx: ChainAdapterContext): boolean {
    // TODO: Implement once a Solana program or cross-chain route is available
    // For now, allow connection but return false to gate write flows.
    return false;
  }

  getAddress(ctx: ChainAdapterContext): string | undefined {
    return ctx.address;
  }
}
