const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const ZERO = BigInt(0);
const BASE = BigInt(32);
const MAX_POSTGRES_BIGINT = BigInt("9223372036854775807");

export type PublicApplicationId = `app_${string}`;

export function encodeApplicationId(id: bigint): PublicApplicationId {
  if (id <= ZERO || id > MAX_POSTGRES_BIGINT) {
    throw new RangeError("application id must be a positive PostgreSQL bigint");
  }

  let value = id;
  let encoded = "";
  while (value > ZERO) {
    encoded = CROCKFORD_BASE32[Number(value % BASE)] + encoded;
    value /= BASE;
  }
  return `app_${encoded}`;
}

export function decodeApplicationId(value: string): bigint {
  if (!/^app_[0-9A-HJKMNP-TV-Z]+$/.test(value)) {
    throw new TypeError("invalid public application id");
  }

  let decoded = ZERO;
  for (const character of value.slice(4)) {
    decoded = decoded * BASE + BigInt(CROCKFORD_BASE32.indexOf(character));
    if (decoded > MAX_POSTGRES_BIGINT) {
      throw new RangeError("public application id exceeds PostgreSQL bigint");
    }
  }
  if (decoded === ZERO || encodeApplicationId(decoded) !== value) {
    throw new TypeError("non-canonical public application id");
  }
  return decoded;
}
