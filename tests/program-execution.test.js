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

const multiplicationProgram = `
INPUT
STORE 11111111
INPUT
STORE 11111110
SET 0
STORE 11111101
;inicio_bucle LOAD 11111110
BRANCHZERO ;mostrar_resultado
DEC 1
STORE 11111110
LOAD 11111111
ADD 11111101
STORE 11111101
BRANCH ;inicio_bucle
;mostrar_resultado
LOAD 11111101
OUTPUT
END`;

const multiplicationTableProgram = `
INPUT
STORE 11110000
SET 1010
STORE 11110001
SET 0
STORE 11110011
SET 11110110
STORE 11110010
;next LOAD 11110011
ADD 11110000
STORE 11110011
STORE [11110010]
LOAD 11110010
INC 1
STORE 11110010
LOAD 11110001
DEC 1
STORE 11110001
BRANCHZERO ;done
BRANCH ;next
;done END`;

const reverseNumbersProgram = `
# Pide 5 números y muéstralos en orden inverso a como se han introducido.
SET 101
STORE 11111111
STORE 11111110
SET 1100100
STORE 11111101
;read_loop LOAD 11111110
BRANCHZERO ;reverse_setup
INPUT
STORE [11111101]
LOAD 11111101
INC 1
STORE 11111101
LOAD 11111110
DEC 1
STORE 11111110
BRANCH ;read_loop
;reverse_setup LOAD 11111101
DEC 1
STORE 11111101
;reverse_loop LOAD [11111101]
OUTPUT
LOAD 11111101
DEC 1
STORE 11111101
LOAD 11111111
DEC 1
STORE 11111111
BRANCHZERO ;done
BRANCH ;reverse_loop
;done END`;

function runProgram(source, inputValues, maxCycles = 100) {
  const program = compileProgram(source);
  const ram = Array(RAM_SIZE).fill(0);
  program.forEach((instruction, address) => {
    ram[address] = instruction;
  });

  let state = createCpuState({ ram });
  let nextInputIndex = 0;
  const outputs = [];
  let cycles = 0;

  while (!state.halted && cycles < maxCycles) {
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
  expect(cycles).toBeLessThan(maxCycles);
  return { outputs, program, ram: state.ram };
}

describe("largest-of-two example program", () => {
  it.each([
    { inputs: [3, 5], expected: 5 },
    { inputs: [5, 3], expected: 5 }
  ])("outputs $expected for inputs $inputs", ({ inputs, expected }) => {
    const { outputs, program } = runProgram(largestOfTwoProgram, inputs);

    expect(program[5]).toBe(0x809);
    expect(outputs).toEqual([expected]);
  });
});

describe("multiplication example program", () => {
  it.each([
    { inputs: [3, 5], expected: 15 },
    { inputs: [5, 3], expected: 15 },
    { inputs: [0, 5], expected: 0 }
  ])("outputs $expected for inputs $inputs", ({ inputs, expected }) => {
    const { outputs } = runProgram(multiplicationProgram, inputs);

    expect(outputs).toEqual([expected]);
  });
});

describe("multiplication-table example program", () => {
  it("stores the first ten multiples in the last ten RAM cells", () => {
    const { program, ram } = runProgram(multiplicationTableProgram, [7], 300);

    expect(program).toContain(0xef2);
    expect(ram.slice(246, 256)).toEqual([7, 14, 21, 28, 35, 42, 49, 56, 63, 70]);
  });
});

describe("reverse-five-numbers example program", () => {
  it("outputs the five inputs in reverse order using indirect addressing", () => {
    const { outputs, program } = runProgram(reverseNumbersProgram, [8, 3, 7, 2, 9], 200);

    expect(program).toContain(0x3ff);
    expect(program).toContain(0xefd);
    expect(program).toContain(0xdfd);
    expect(outputs).toEqual([9, 2, 7, 3, 8]);
  });
});