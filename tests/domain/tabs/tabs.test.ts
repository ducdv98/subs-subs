import { describe, expect, it } from "vitest";
import { isWatchUrl } from "../../../app/domain/tabs/tabs";

describe("isWatchUrl", () => {
  it("true for a youtube watch url", () => {
    expect(isWatchUrl("https://www.youtube.com/watch?v=abc123")).toBe(true);
  });

  it("true for a watch url with extra path/query", () => {
    expect(
      isWatchUrl("https://www.youtube.com/watch?v=abc123&t=30s"),
    ).toBe(true);
  });

  it("false for the youtube home page", () => {
    expect(isWatchUrl("https://www.youtube.com/")).toBe(false);
  });

  it("false for other youtube.com paths", () => {
    expect(isWatchUrl("https://www.youtube.com/results?search_query=x")).toBe(
      false,
    );
    expect(isWatchUrl("https://www.youtube.com/feed/subscriptions")).toBe(
      false,
    );
  });

  it("false for non-youtube domains", () => {
    expect(isWatchUrl("https://example.com/watch")).toBe(false);
    expect(isWatchUrl("https://www.youtube.com.evil.com/watch")).toBe(false);
  });

  it("false for http (non-https) youtube watch url", () => {
    expect(isWatchUrl("http://www.youtube.com/watch?v=abc123")).toBe(false);
  });

  it("false for undefined, empty, or malformed input", () => {
    expect(isWatchUrl(undefined)).toBe(false);
    expect(isWatchUrl("")).toBe(false);
    expect(isWatchUrl("not a url")).toBe(false);
  });
});
