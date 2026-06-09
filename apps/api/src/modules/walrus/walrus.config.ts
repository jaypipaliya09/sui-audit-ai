/**
 * Walrus configuration constants.
 * These provide defaults when env vars are not set.
 */
export const WALRUS_CONFIG = {
  /** Default publisher URL for storing blobs */
  PUBLISHER_URL: 'https://publisher.walrus-testnet.walrus.space',

  /** Default aggregator URL for reading blobs */
  AGGREGATOR_URL: 'https://aggregator.walrus-testnet.walrus.space',

  /** Default number of epochs blobs remain stored */
  DEFAULT_EPOCHS: 5,

  /** Upload timeout in milliseconds */
  UPLOAD_TIMEOUT_MS: 30_000,
} as const;
