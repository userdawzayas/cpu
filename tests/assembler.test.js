import { compileProgram } from "../lib/assembler.mjs";
import { describe, expect, it } from "vitest";

describe("assembler", () => {
  it("assembles the arithmetic example into instruction bytes", () => {
    expect(compileProgram("LOAD 15\nADD 14\nSTORE 13\nEND")).toEqual([
      0x5f, 0x1e, 0x3d, 0x00
    ]);
  });

  it("accepts decimal, binary, and hexadecimal operands and comments", () => {
    expect(compileProgram("set 15 ; max\nINC 0b0010\nDEC 0011\nBRANCH 0x4 // loop")).toEqual([
      0xcf, 0xa2, 0xb3, 0x64
    ]);
  });

  it("accepts hash comments at the end of a line or on their own line", () => {
    expect(compileProgram("SET 5 # immediate value\n# skip this line\nEND")).toEqual([
      0xc5, 0x00
    ]);
  });

  it("resolves a branch to a label declared on the same line as its instruction", () => {
    expect(compileProgram("BRANCH ;finish\nSET 1\n;finish END ; done")).toEqual([
      0x62, 0xc1, 0x00
    ]);
  });

  it("resolves a branch to a label on the line before its instruction", () => {
    expect(compileProgram("BRANCHZERO ;loop\n;loop\nINC 1\nEND")).toEqual([
      0x71, 0xa1, 0x00
    ]);
  });

  it("offsets label addresses by the starting memory address", () => {
    const source = "BRANCH ;x\nEND\n;x OUTPUT";

    expect(compileProgram(source, 0)).toEqual([0x62, 0x00, 0x92]);
    expect(compileProgram(source, 1)).toEqual([0x63, 0x00, 0x92]);
  });

  it("keeps semicolon comments and rejects missing or duplicate labels", () => {
    expect(compileProgram("; comment only\nSET 2 ; ordinary comment\nEND")).toEqual([
      0xc2, 0x00
    ]);
    expect(() => compileProgram("BRANCH ;missing\nEND")).toThrow("unknown label ;missing");
    expect(() => compileProgram(";again SET 1\n;AGAIN END")).toThrow("duplicate label ;again");
  });

  it("encodes input and output without operands", () => {
    expect(compileProgram("INPUT\nOUTPUT")).toEqual([0x91, 0x92]);
  });

  it("reports an unknown instruction with its source line", () => {
    expect(() => compileProgram("\nNOPE")).toThrow("Line 2: unknown instruction NOPE.");
  });

  it("rejects missing, extra, and out-of-range operands", () => {
    expect(() => compileProgram("LOAD")).toThrow("LOAD requires one operand");
    expect(() => compileProgram("END 0")).toThrow("END does not take an operand");
    expect(() => compileProgram("LOAD 16")).toThrow("operand must be between 0 and 15");
  });

  it("allows at most 16 instructions and rejects an empty program", () => {
    const fullProgram = Array(16).fill("END").join("\n");

    expect(compileProgram(fullProgram)).toHaveLength(16);
    expect(() => compileProgram(`${fullProgram}\nEND`)).toThrow(
      "The program is longer than the 16-byte memory."
    );
    expect(() => compileProgram(" ; comment only")).toThrow("Enter at least one instruction.");
  });
});