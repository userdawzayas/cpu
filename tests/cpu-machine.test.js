import { describe, expect, it, vi } from "vitest";
import {
  createCpuState,
  decodeInstruction,
  executeDecodedInstruction,
  RAM_SIZE,
  resetCpuState
} from "../lib/cpu-machine.mjs";

function stateWithInstruction(opcode, operand = 0, overrides = {}) {
  const state = createCpuState({ ram: overrides.ram ?? Array(RAM_SIZE).fill(0) });
  state.registers.cir = (opcode << 4) | operand;
  Object.assign(state.registers, overrides.registers);
  return state;
}

describe("CPU state", () => {
  it("creates five zeroed registers and 16 RAM cells", () => {
    const state = createCpuState();

    expect(state.registers).toEqual({ acc: 0, pc: 0, mar: 0, mdr: 0, cir: 0 });
    expect(state.ram).toEqual(Array(16).fill(0));
    expect(state.halted).toBe(false);
  });

  it("copies supplied RAM and rejects invalid memory shapes or values", () => {
    const ram = Array(16).fill(0);
    const state = createCpuState({ ram });
    ram[0] = 9;

    expect(state.ram[0]).toBe(0);
    expect(() => createCpuState({ ram: [0] })).toThrow("exactly 16 values");
    expect(() => createCpuState({ ram: [NaN, ...Array(15).fill(0)] })).toThrow(
      "finite numbers"
    );
  });

  it("resets registers and halt state without clearing RAM", () => {
    const state = stateWithInstruction(0, 0, {
      ram: [7, ...Array(15).fill(0)],
      registers: { acc: 9, pc: 4, mar: 2, mdr: 8, cir: 0 }
    });
    state.halted = true;

    expect(resetCpuState(state)).toEqual({
      registers: { acc: 0, pc: 0, mar: 0, mdr: 0, cir: 0 },
      ram: [7, ...Array(15).fill(0)],
      halted: false
    });
  });
});

describe("instruction decoding and execution", () => {
  it("splits an instruction byte into a four-bit opcode and operand", () => {
    expect(decodeInstruction(0xaf)).toEqual({ opcode: 10, operand: 15 });
    expect(decodeInstruction(-1)).toEqual({ opcode: 15, operand: 15 });
  });

  it("halts on END", () => {
    const state = stateWithInstruction(0);

    expect(executeDecodedInstruction(state).halted).toBe(true);
    expect(state.halted).toBe(false);
  });

  it("adds and subtracts the addressed RAM value", () => {
    const ram = Array(16).fill(0);
    ram[3] = 4;
    const addState = stateWithInstruction(1, 3, { ram, registers: { acc: 10 } });
    const subtractState = stateWithInstruction(2, 3, { ram, registers: { acc: 10 } });

    expect(executeDecodedInstruction(addState).registers.acc).toBe(14);
    expect(executeDecodedInstruction(subtractState).registers.acc).toBe(6);
  });

  it("stores, resets, and loads addressed memory", () => {
    const ram = Array(16).fill(0);
    ram[3] = 12;
    const storeState = stateWithInstruction(3, 5, { registers: { acc: 17 } });
    const resetState = stateWithInstruction(4, 3, { ram });
    const loadState = stateWithInstruction(5, 3, { ram });

    expect(executeDecodedInstruction(storeState).ram[5]).toBe(17);
    expect(storeState.ram[5]).toBe(0);
    expect(executeDecodedInstruction(resetState).ram[3]).toBe(0);
    expect(executeDecodedInstruction(loadState).registers.acc).toBe(12);
  });

  it("supports unconditional, zero, and non-negative branches", () => {
    const always = stateWithInstruction(6, 9);
    const zero = stateWithInstruction(7, 8, { registers: { acc: 0 } });
    const nonZero = stateWithInstruction(7, 8, { registers: { acc: 1 } });
    const nonNegative = stateWithInstruction(8, 7, { registers: { acc: 0 } });
    const negative = stateWithInstruction(8, 7, { registers: { acc: -1 } });

    expect(executeDecodedInstruction(always).registers.pc).toBe(9);
    expect(executeDecodedInstruction(zero).registers.pc).toBe(8);
    expect(executeDecodedInstruction(nonZero).registers.pc).toBe(0);
    expect(executeDecodedInstruction(nonNegative).registers.pc).toBe(7);
    expect(executeDecodedInstruction(negative).registers.pc).toBe(0);
  });

  it("injects input and output rather than using browser dialogs", () => {
    const inputState = stateWithInstruction(9, 1);
    const outputState = stateWithInstruction(9, 2, { registers: { acc: -4 } });
    const readInput = vi.fn(() => "255");
    const writeOutput = vi.fn();

    expect(executeDecodedInstruction(inputState, { readInput }).registers.acc).toBe(255);
    executeDecodedInstruction(outputState, { writeOutput });
    expect(readInput).toHaveBeenCalledOnce();
    expect(writeOutput).toHaveBeenCalledWith(-4);
    expect(() => executeDecodedInstruction(inputState)).toThrow("io.readInput");
  });

  it("increments, decrements, and sets the accumulator from the operand", () => {
    const increment = stateWithInstruction(10, 3, { registers: { acc: 4 } });
    const decrement = stateWithInstruction(11, 3, { registers: { acc: 4 } });
    const set = stateWithInstruction(12, 3, { registers: { acc: 4 } });

    expect(executeDecodedInstruction(increment).registers.acc).toBe(7);
    expect(executeDecodedInstruction(decrement).registers.acc).toBe(1);
    expect(executeDecodedInstruction(set).registers.acc).toBe(3);
  });

  it("preserves current unbounded arithmetic until overflow semantics are decided", () => {
    const ram = Array(16).fill(0);
    ram[0] = 1;
    const state = stateWithInstruction(1, 0, { ram, registers: { acc: 127 } });

    expect(executeDecodedInstruction(state).registers.acc).toBe(128);
  });

  it("rejects unsupported opcodes", () => {
    expect(() => executeDecodedInstruction(stateWithInstruction(13))).toThrow("Unsupported opcode 13");
  });
});