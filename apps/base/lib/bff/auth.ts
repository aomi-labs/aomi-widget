import { betterAuth } from "better-auth";
import { getPool } from "./db";

export const auth = betterAuth({
  database: getPool(),
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: process.env.AOMI_BETTER_AUTH_EMAIL_PASSWORD === "1",
  },
});
