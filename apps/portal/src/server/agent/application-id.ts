const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const MAX_POSTGRES_BIGINT = (1n << 63n) - 1n;

export type PublicApplicationId = `app_${string}`;

export function encodeApplicationId(id: bigint): PublicApplicationId {
  if (id <= 0n || id > MAX_POSTGRES_BIGINT) {
    throw new RangeError("application id must be a positive PostgreSQL bigint");
  }

  let value = id;
  let encoded = "";
  while (value > 0n) {
    encoded = CROCKFORD_BASE32[Number(value % 32n)] + encoded;
    value /= 32n;
  }
  return `app_${encoded}`;
}

export function decodeApplicationId(value: string): bigint {
  if (!/^app_[0-9A-HJKMNP-TV-Z]+$/.test(value)) {
    throw new TypeError("invalid public application id");
  }

  let decoded = 0n;
  for (const character of value.slice(4)) {
    decoded = decoded * 32n + BigInt(CROCKFORD_BASE32.indexOf(character));
    if (decoded > MAX_POSTGRES_BIGINT) {
      throw new RangeError("public application id exceeds PostgreSQL bigint");
    }
  }
  if (decoded === 0n || encodeApplicationId(decoded) !== value) {
    throw new TypeError("non-canonical public application id");
  }
  return decoded;
}
