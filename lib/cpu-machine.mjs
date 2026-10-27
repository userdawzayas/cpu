export const RAM_SIZE = 16;

const registerNames = ["acc", "pc", "mar", "mdr", "cir"];

export function createCpuState({ ram = Array(RAM_SIZE).fill(0) } = {}) {
  if (!Array.isArray(ram) || ram.length !== RAM_SIZE) {
    throw new RangeError(`RAM must contain exactly ${RAM_SIZE} values.`);
  }
  if (ram.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
    throw new TypeError("RAM values must be finite numbers.");
  }

  return {
    registers: Object.fromEntries(registerNames.map((name) => [name, 0])),
    ram: [...ram],
    halted: false
  };
}

export function resetCpuState(state) {
  return {
    registers: Object.fromEntries(registerNames.map((name) => [name, 0])),
    ram: [...state.ram],
    halted: false
  };
}

export function decodeInstruction(instructionByte) {
  const byte = instructionByte & 0xff;
  return {
    opcode: byte >>> 4,
    operand: byte & 0x0f
  };
}

export function executeDecodedInstruction(state, io = {}) {
  if (state.halted) {
    return state;
  }

  const { opcode, operand } = decodeInstruction(state.registers.cir);
  const nextState = {
    registers: { ...state.registers },
    ram: [...state.ram],
    halted: state.halted
  };

  switch (opcode) {
    case 0:
      nextState.halted = true;
      break;
    case 1:
      nextState.registers.acc += state.ram[operand];
      break;
    case 2:
      nextState.registers.acc -= state.ram[operand];
      break;
    case 3:
      nextState.ram[operand] = state.registers.acc;
      break;
    case 4:
      nextState.ram[operand] = 0;
      break;
    case 5:
      nextState.registers.acc = state.ram[operand];
      break;
    case 6:
      nextState.registers.pc = operand;
      break;
    case 7:
      if (state.registers.acc === 0) {
        nextState.registers.pc = operand;
      }
      break;
    case 8:
      if (state.registers.acc >= 0) {
        nextState.registers.pc = operand;
      }
      break;
    case 9:
      if (operand === 1) {
        if (typeof io.readInput !== "function") {
          throw new TypeError("INPUT requires an io.readInput function.");
        }
        nextState.registers.acc = Number.parseInt(io.readInput(), 10) & 0xff;
      } else if (operand === 2) {
        if (typeof io.writeOutput !== "function") {
          throw new TypeError("OUTPUT requires an io.writeOutput function.");
        }
        io.writeOutput(state.registers.acc);
      }
      break;
    case 10:
      nextState.registers.acc += operand;
      break;
    case 11:
      nextState.registers.acc -= operand;
      break;
    case 12:
      nextState.registers.acc = operand;
      break;
    default:
      throw new RangeError(`Unsupported opcode ${opcode}.`);
  }

  return nextState;
}