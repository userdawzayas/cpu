import { describe, expect, it } from "vitest";
import {
  bin2dec,
  bin2hex,
  dec2bin,
  dec2hex,
  hex2bin,
  hex2dec,
  pad
} from "../lib/number-format.mjs";

describe("number formatting", () => {
  it("pads values to the requested minimum width", () => {
    expect(pad("7", 3)).toBe("007");
    expect(pad("123", 2)).toBe("123");
  });

  it("converts bytes between decimal, binary, and hexadecimal", () => {
    expect(dec2bin(42)).toBe("00101010");
    expect(dec2hex(42)).toBe("2a");
    expect(hex2bin("2a")).toBe("00101010");
    expect(bin2hex("00101010")).toBe("2a");
  });

  it("wraps decimal values to eight bits", () => {
    expect(dec2bin(256)).toBe("00000000");
    expect(dec2hex(-1)).toBe("ff");
  });

  it("interprets the high bit as a negative signed byte", () => {
    expect(bin2dec("01111111")).toBe(127);
    expect(bin2dec("10000000")).toBe(-128);
    expect(bin2dec("11111111")).toBe(-1);
    expect(hex2dec("80")).toBe(-128);
    expect(hex2dec("ff")).toBe(-1);
  });
});