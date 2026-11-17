import { describe, expect, it } from "vitest";
import { generateApiKey, hashApiKey } from "./api-key";

describe("api-key", () => {
  it("generates sk_live keys with 32 random alphanumeric chars", () => {
    const key = generateApiKey();
    expect(key).toMatch(/^sk_live_[A-Za-z0-9]{32}$/);
    expect(generateApiKey()).not.toBe(key);
  });

  it("hashes keys to sha256:<hex> deterministically", async () => {
    const a = await hashApiKey("sk_live_example_key");
    const b = await hashApiKey("sk_live_example_key");
    expect(a).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(a).toBe(b);
    expect(await hashApiKey("sk_live_other_key")).not.toBe(a);
  });
});
