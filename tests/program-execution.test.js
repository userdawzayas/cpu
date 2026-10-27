import { compileProgram } from "../lib/assembler.mjs";
import { createCpuState, executeDecodedInstruction, RAM_SIZE } from "../lib/cpu-machine.mjs";
import { describe, expect, it } from "vitest";

const largestOfTwoProgram = `
INPUT
STORE 1111
INPUT
STORE 1110
SUB 1111
BRANCHPOS ;mostrar_segundo
LOAD 1111
OUTPUT
END
;mostrar_segundo
LOAD 1110
OUTPUT
END`;

function runProgram(source, inputValues) {
  const program = compileProgram(source);
  const ram = Array(RAM_SIZE).fill(0);
  program.forEach((instruction, address) => {
    ram[address] = instruction;
  });

  let state = createCpuState({ ram });
  let nextInputIndex = 0;
  const outputs = [];
  let cycles = 0;

  while (!state.halted && cycles < 100) {
    const programCounter = state.registers.pc;
    state = {
      ...state,
      registers: {
        ...state.registers,
        mar: programCounter,
        mdr: state.ram[programCounter],
        cir: state.ram[programCounter],
        pc: programCounter + 1
      }
    };
    state = executeDecodedInstruction(state, {
      readInput: () => inputValues[nextInputIndex++],
      writeOutput: (value) => outputs.push(value)
    });
    cycles += 1;
  }

  expect(state.halted).toBe(true);
  expect(cycles).toBeLessThan(100);
  return { outputs, program };
}

describe("largest-of-two example program", () => {
  it.each([
    { inputs: [3, 5], expected: 5 },
    { inputs: [5, 3], expected: 5 }
  ])("outputs $expected for inputs $inputs", ({ inputs, expected }) => {
    const { outputs, program } = runProgram(largestOfTwoProgram, inputs);

    expect(program[5]).toBe(0x89);
    expect(outputs).toEqual([expected]);
  });
});