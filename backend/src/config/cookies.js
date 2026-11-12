export function cookieSettings(env = process.env) {
  const production = env.NODE_ENV === "production";
  const sameSite = env.COOKIE_SAME_SITE || (production ? "none" : "strict");
  if (!["strict", "lax", "none"].includes(sameSite))
    throw new Error("COOKIE_SAME_SITE must be strict, lax or none");
  return { sameSite, secure: production || sameSite === "none" };
}
