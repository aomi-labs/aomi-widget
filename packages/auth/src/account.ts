export { createDefaultWalletAttesters } from "./providers/default-wallet-attesters";

export {
  fetchAttestedWallets,
  validWalletAddress,
} from "./providers/wallet-attestation";

export {
  ensureAccountSchema,
  deactivateAomiAccount,
  fetchAttestedProviderWallets,
  getAccountResponseForBetterAuthSession,
  getOrCreateAomiUserForBetterAuthSession,
  linkProviderIdentity,
  renameAuthIdentity,
  renameWallet,
  resolveSignal,
  syncProviderAttestedWallets,
  syncProviderWallets,
  syncSiweWalletsForUser,
  unlinkAuthIdentity,
  unlinkWallet,
  updateAccountProfile,
  upsertVerifiedWallet,
  type DeactivateAomiAccountResult,
} from "./service/account-service";

export {
  exchangeProviderForExistingSession,
  createDefaultProviderCredentialVerifiers,
  isVerifiedProviderTokenCredential,
  providerSessionUserSeed,
  verifyProviderCredential,
  type ProviderExchangeResult,
} from "./service/provider-exchange";
export type {
  ProviderCredentialVerifier,
  ProviderCredentialVerifierRegistry,
  ProviderTokenCredential,
  VerifiedProviderTokenCredential,
  VerifiedProviderCredential,
  VerifiedProviderToken,
  VerifyProviderCredentialOptions,
} from "./providers/account-credentials";

export {
  DEFAULT_WALLET_LINK_NONCE_MAX_AGE_MS,
  createWalletLinkNonce,
  verifyWalletLinkNonce,
  verifyWalletLinkSignature,
  walletLinkMessageMatches,
  type WalletLinkNoncePayload,
} from "./service/wallet-linking";

export type {
  AttestedWallet,
  AttestedWalletProvider,
  WalletAttestationLogger,
  WalletAttestationRequest,
  WalletAttester,
  WalletAttesterRegistry,
} from "./providers/wallet-attestation";
