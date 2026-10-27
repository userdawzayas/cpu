const instructions = {
  END: { opcode: 0, operand: 0, takesOperand: false },
  ADD: { opcode: 1, takesOperand: true },
  SUB: { opcode: 2, takesOperand: true },
  STORE: { opcode: 3, takesOperand: true },
  RESET: { opcode: 4, takesOperand: true },
  LOAD: { opcode: 5, takesOperand: true },
  BRANCH: { opcode: 6, takesOperand: true },
  BRANCHZERO: { opcode: 7, takesOperand: true },
  BRANCHPOS: { opcode: 8, takesOperand: true },
  INPUT: { opcode: 9, operand: 1, takesOperand: false },
  OUTPUT: { opcode: 9, operand: 2, takesOperand: false },
  INC: { opcode: 10, takesOperand: true },
  DEC: { opcode: 11, takesOperand: true },
  SET: { opcode: 12, takesOperand: true }
};

function parseOperand(addressText) {
  if (/^0b[01]+$/i.test(addressText)) {
    return Number.parseInt(addressText.slice(2), 2);
  }
  if (/^[01]{4}$/.test(addressText)) {
    return Number.parseInt(addressText, 2);
  }
  if (/^0x[0-9a-f]+$/i.test(addressText)) {
    return Number.parseInt(addressText, 16);
  }
  if (/^\d+$/.test(addressText)) {
    return Number.parseInt(addressText, 10);
  }
  return Number.NaN;
}

function parseSourceLine(sourceLine, lineNumber) {
  let line = sourceLine.replace(/(#|\/\/).*$/, "").trim();
  if (!line) {
    return null;
  }

  let label = null;
  const labelMatch = line.match(/^;([A-Za-z_][A-Za-z0-9_]*)(?:\s+(.*))?$/);
  if (labelMatch) {
    const remainder = labelMatch[2] || "";
    const startsWithInstruction = remainder && instructions[remainder.split(/\s+/)[0].toUpperCase()];
    if (!remainder || startsWithInstruction) {
      label = labelMatch[1].toUpperCase();
      line = remainder;
    } else {
      return null;
    }
  }

  const branchReference = line.match(/^(BRANCH|BRANCHZERO|BRANCHPOS)\s+(;[A-Za-z_][A-Za-z0-9_]*)(?:\s+;.*)?$/i);
  if (branchReference) {
    line = `${branchReference[1]} ${branchReference[2]}`;
  } else {
    line = line.replace(/;.*$/, "").trim();
  }

  if (!line) {
    return { label, instruction: null };
  }

  const parts = line.split(/\s+/);
  const mnemonic = parts[0].toUpperCase();
  if (!instructions[mnemonic]) {
    throw new Error(`Line ${lineNumber}: unknown instruction ${parts[0]}.`);
  }

  return {
    label,
    instruction: { lineNumber, mnemonic, parts }
  };
}

export function compileProgram(source) {
  const labels = new Map();
  const parsedLines = [];
  const lines = source.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const parsed = parseSourceLine(lines[index], index + 1);
    if (!parsed) {
      continue;
    }
    if (parsed.label) {
      if (labels.has(parsed.label)) {
        throw new Error(`Line ${index + 1}: duplicate label ;${parsed.label.toLowerCase()}.`);
      }
      labels.set(parsed.label, parsedLines.length);
    }
    if (parsed.instruction) {
      parsedLines.push(parsed.instruction);
    }
  }

  if (parsedLines.length === 0) {
    throw new Error("Enter at least one instruction.");
  }

  if (parsedLines.length > 16) {
    throw new Error("The program is longer than the 16-byte memory.");
  }

  const bytes = parsedLines.map(({ lineNumber, mnemonic, parts }) => {
    const instruction = instructions[mnemonic];
    if (instruction.takesOperand && parts.length !== 2) {
      throw new Error(`Line ${lineNumber}: ${mnemonic} requires one operand (0-15).`);
    }
    if (!instruction.takesOperand && parts.length !== 1) {
      throw new Error(`Line ${lineNumber}: ${mnemonic} does not take an operand.`);
    }

    let operand = instruction.operand || 0;
    if (instruction.takesOperand) {
      const branchInstruction = ["BRANCH", "BRANCHZERO", "BRANCHPOS"].includes(mnemonic);
      const labelReference = branchInstruction && parts[1].match(/^;([A-Za-z_][A-Za-z0-9_]*)$/);
      if (labelReference) {
        const labelAddress = labels.get(labelReference[1].toUpperCase());
        if (labelAddress === undefined) {
          throw new Error(`Line ${lineNumber}: unknown label ${parts[1]}.`);
        }
        operand = labelAddress;
      } else {
        operand = parseOperand(parts[1]);
      }

      if (Number.isNaN(operand) || operand < 0 || operand > 15) {
        throw new Error(`Line ${lineNumber}: operand must be between 0 and 15.`);
      }
    }

    return (instruction.opcode << 4) | operand;
  });

  return bytes;
}