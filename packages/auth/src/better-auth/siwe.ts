import { verifyMessage as verifyViemMessage } from "viem";

export async function verifySiweMessage(input: {
  message: string;
  signature: string;
  address: string;
}): Promise<boolean> {
  try {
    return await verifyViemMessage({
      address: input.address as `0x${string}`,
      message: input.message,
      signature: input.signature as `0x${string}`,
    });
  } catch {
    return false;
  }
}
