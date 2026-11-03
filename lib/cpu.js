import { compileProgram } from "./assembler.mjs";
import {
	bin2dec,
	bin2hex,
	bin2dec12,
	dec2bin,
	dec2bin12,
	dec2hex,
	dec2hex12,
	hex2bin,
	hex2dec,
	hex2dec12,
	pad
} from "./number-format.mjs";

var examplePrograms = {
	add: "# Suma dos números y muestra el resultado.\n\n" +
		"# Algoritmo:\n" +
		"# Pide dos números, guarda el primero y suma el segundo al acumulador.\n\n" +
		"# Implementación\n" +
		"INPUT # Pido el primer sumando\n" +
		"STORE 1111 # Guardo el primer sumando en la dirección 15\n" +
		"INPUT # Pido el segundo sumando\n" +
		"ADD 1111 # Sumo el valor guardado al acumulador\n" +
		"OUTPUT # Muestro la suma\n" +
		"END # Termino el programa",
	largest: "# Compara dos números y muestra el mayor.\n\n" +
		"# Algoritmo:\n" +
		"# Guarda ambos números, calcula su diferencia y usa un salto para elegir cuál mostrar.\n\n" +
		"# Implementación\n" +
		"INPUT # Pido el primer número\n" +
		"STORE 1111 # Guardo el primer número\n" +
		"INPUT # Pido el segundo número\n" +
		"STORE 1110 # Guardo el segundo número\n" +
		"SUB 1111 # Resto el primer número al segundo\n" +
		"BRANCHPOS ;showSecond # Si el resultado no es negativo, el segundo es mayor\n" +
		"LOAD 1111 # Cargo el primer número, que es el mayor o igual\n" +
		"OUTPUT # Muestro el número mayor\n" +
		"END # Termino el programa\n" +
		";showSecond LOAD 1110 # Cargo el segundo número porque es mayor\n" +
		"OUTPUT # Muestro el número mayor\n" +
		"END # Termino el programa",
	multiply: "# Multiplica dos números y muestra el resultado.\n\n" +
		"# Algoritmo:\n" +
		"# Pide el multiplicando y el multiplicador; suma el multiplicando tantas veces como indica el multiplicador.\n\n" +
		"# Implementación\n" +
		"INPUT # Pido el multiplicando\n" +
		"STORE 11111111 # Almaceno el multiplicando\n" +
		"INPUT # Pido el multiplicador\n" +
		"STORE 11111110 # Almaceno el multiplicador\n" +
		"SET 0 # Inicio la multiplicación en cero\n" +
		"STORE 11111101 # Almaceno el resultado\n" +
		";inicio_bucle LOAD 11111110 # Cargo el multiplicador\n" +
		"BRANCHZERO ;mostrar_resultado # Compruebo si el multiplicador llegó a cero\n" +
		"DEC 1 # Decremento el multiplicador\n" +
		"STORE 11111110 # Guardo el multiplicador actualizado\n" +
		"LOAD 11111111 # Cargo el multiplicando\n" +
		"ADD 11111101 # Sumo el multiplicando al resultado\n" +
		"STORE 11111101 # Almaceno el resultado actualizado\n" +
		"BRANCH ;inicio_bucle # Repito la suma\n" +
		";mostrar_resultado LOAD 11111101 # Cargo el resultado final\n" +
		"OUTPUT # Muestro el resultado\n" +
		"END # Termino el programa",
	multiplyTable: "# Calcula la tabla de multiplicar y la guarda en las últimas direcciones de RAM.\n\n" +
		"# Algoritmo:\n" +
		"# Suma repetidamente el número base, guarda cada múltiplo mediante un puntero indirecto y repite diez veces.\n\n" +
		"# Implementación\n" +
		"INPUT # Pido el número de la tabla\n" +
		"STORE 11110000 # Guardo el número base\n" +
		"SET 1010 # Inicio el contador en diez\n" +
		"STORE 11110001 # Guardo el contador de productos\n" +
		"SET 0 # Inicio el producto acumulado en cero\n" +
		"STORE 11110011 # Guardo el producto acumulado\n" +
		"SET 11110110 # Selecciono la primera dirección final de RAM\n" +
		"STORE 11110010 # Guardo el puntero de destino\n" +
		";next LOAD 11110011 # Cargo el producto anterior\n" +
		"ADD 11110000 # Sumo el número base para obtener el siguiente múltiplo\n" +
		"STORE 11110011 # Guardo el nuevo múltiplo\n" +
		"STORE [11110010] # Almaceno el múltiplo en la dirección apuntada\n" +
		"LOAD 11110010 # Cargo el puntero de destino\n" +
		"INC 1 # Avanzo una dirección\n" +
		"STORE 11110010 # Guardo el puntero actualizado\n" +
		"LOAD 11110001 # Cargo cuántos productos faltan\n" +
		"DEC 1 # Decremento el contador\n" +
		"STORE 11110001 # Guardo el contador actualizado\n" +
		"BRANCHZERO ;done # Termino cuando ya guardé diez productos\n" +
		"BRANCH ;next # Vuelvo al inicio del bucle\n" +
		";done END # Termino el programa",
	reverseNumbers: "# Pide 5 números y los muestra en orden inverso.\n\n" +
		"# Algoritmo:\n" +
		"# Guarda el total y los números pendientes. Pide cada número mientras queden entradas y lo almacena con un puntero indirecto.\n" +
		"# Al terminar, reutiliza el total como contador y recorre el puntero hacia atrás para mostrar los cinco números.\n\n" +
		"# Implementación\n" +
		"SET 101 # Pongo cinco en el acumulador como total de números\n" +
		"STORE 11111111 # Guardo el total de números\n" +
		"STORE 11111110 # Inicializo cuántos números faltan por pedir\n" +
		"SET 1100100 # Selecciono la dirección 100 para guardar el primer número\n" +
		"STORE 11111101 # Inicializo el puntero de escritura\n" +
		";read_loop LOAD 11111110 # Cargo cuántos números faltan por pedir\n" +
		"BRANCHZERO ;reverse_setup # Si no faltan números, paso a mostrarlos\n" +
		"INPUT # Pido el siguiente número\n" +
		"STORE [11111101] # Guardo el número en la dirección apuntada\n" +
		"LOAD 11111101 # Cargo el puntero de escritura\n" +
		"INC 1 # Avanzo a la siguiente dirección\n" +
		"STORE 11111101 # Actualizo el puntero de escritura\n" +
		"LOAD 11111110 # Cargo cuántos números faltan por pedir\n" +
		"DEC 1 # Decremento el contador de entradas\n" +
		"STORE 11111110 # Guardo el contador actualizado\n" +
		"BRANCH ;read_loop # Compruebo si debo pedir otro número\n" +
		";reverse_setup LOAD 11111101 # Cargo el puntero situado después del último número\n" +
		"DEC 1 # Retrocedo hasta la dirección del último número\n" +
		"STORE 11111101 # Inicializo el puntero de lectura\n" +
		";reverse_loop LOAD [11111101] # Cargo el número apuntado\n" +
		"OUTPUT # Muestro el número\n" +
		"LOAD 11111101 # Cargo el puntero de lectura\n" +
		"DEC 1 # Retrocedo una dirección\n" +
		"STORE 11111101 # Actualizo el puntero de lectura\n" +
		"LOAD 11111111 # Cargo cuántos números faltan por mostrar\n" +
		"DEC 1 # Decremento el total restante\n" +
		"STORE 11111111 # Guardo el contador de salida actualizado\n" +
		"BRANCHZERO ;done # Termino después de mostrar los cinco números\n" +
		"BRANCH ;reverse_loop # Vuelvo a mostrar el número anterior\n" +
		";done END # Termino el programa"
};

function parseSourceNumber(value, radix) {
	if(radix === 'binary' && /^[01]+$/.test(value)) {
		return Number.parseInt(value, 2);
	}
	if(radix === 'denary' && /^(?:0d)?\d+$/i.test(value)) {
		return Number.parseInt(value.replace(/^0d/i, ''), 10);
	}
	if(radix === 'hex' && /^(?:0x)?[0-9a-f]+$/i.test(value)) {
		return Number.parseInt(value.replace(/^0x/i, ''), 16);
	}
	return Number.NaN;
}

function formatSourceNumber(value, radix) {
	switch(radix) {
		case 'binary':
			return value.toString(2);
		case 'denary':
			return '0d' + value;
		case 'hex':
			return '0x' + value.toString(16).toUpperCase();
	}
}

function convertSourceOperands(source, fromRadix, toRadix) {
	return source.split('\n').map(function(line) {
		return line.replace(/^((?:\s*;[A-Za-z_][A-Za-z0-9_]*\s+)?\s*[A-Za-z]+\s+)(\[?)([^\]\s#;]+)(\]?)(.*)$/, function(match, prefix, openBracket, operand, closeBracket, suffix) {
			var value = parseSourceNumber(operand, fromRadix);
			if(Number.isNaN(value) || value < 0 || value > 255) {
				return match;
			}
			return prefix + openBracket + formatSourceNumber(value, toRadix) + closeBracket + suffix;
		});
	}).join('\n');
}

function showModal(modal) {
	if(!modal || modal.classList.contains("in")) return;
	var backdrop = document.createElement("div");
	backdrop.className = "modal-backdrop fade in";
	backdrop.addEventListener("click", function() { hideModal(modal); });
	document.body.appendChild(backdrop);
	modal.classList.add("in");
	modal.setAttribute("aria-hidden", "false");
	modal._backdrop = backdrop;
	modal._previousFocus = document.activeElement;
	modal.addEventListener("keydown", modal._escapeHandler = function(event) {
		if(event.key === "Escape") {
			event.preventDefault();
			hideModal(modal);
		}
	});
	var focusTarget = modal.querySelector("input, textarea, button");
	if(focusTarget) focusTarget.focus();
}

function hideModal(modal) {
	if(!modal || !modal.classList.contains("in")) return;
	modal.classList.remove("in");
	modal.setAttribute("aria-hidden", "true");
	if(modal._backdrop) modal._backdrop.remove();
	modal.removeEventListener("keydown", modal._escapeHandler);
	if(modal._previousFocus && modal._previousFocus.focus) modal._previousFocus.focus();
}

// example = "55 16 37 92 00 30 01 00 00 00 00 00 00 00 00 00";
var cpu = {
	
	step: function() {
		function setState(nextState, stageName, description) {
			
			description = description.replace(/\*(.*?)\*/g, function(match, contents) {
				return '<span class="hint_name">' + contents + '</span>';
			});
			cpu.showHint('<span class="fetch_decode_execute ' + stageName.toLowerCase() + '">' + stageName + '</span>' + description);
			cpu.state = nextState;
		}
		switch(cpu.state) {
			
			case 0:
				setState(1, "Fetch", "The *Control Unit* copies the value in the *Program Counter* register to the *Memory Address Register* and onto the *Address Bus*");
				cpu.registers.mar = cpu.registers.pc;
				cpu.updateValues();
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#reg_pc,#reg_mar').forEach(element => element.classList.add('active'));
				document.querySelectorAll('.current_instruction').forEach(element => element.classList.remove('current_instruction'));
				document.querySelector('#ram_address_' + cpu.registers.pc).classList.add('current_instruction');
				break;
			case 1:
				setState(2, "Fetch", "The *Control Unit* tells the memory store to look at the address on the *Address Bus* and load the value stored there onto the *Data Bus*");
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelector('#ram_value_' + cpu.registers.mar).classList.add('active');
			break;
			
			case 2:
				setState(3, "Fetch", "The *Control Unit* stores the value on the *Data Bus* into the *Memory Data Register*");
				cpu.registers.mdr = cpu.ram[cpu.registers.mar];
				cpu.updateValues();
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#reg_mdr').forEach(element => element.classList.add('active'));
				break;
				
			case 3:
				setState(4, "Fetch", "The *Control Unit* copies the value from the *Memory Data Register* into the *Current Instruction Register*");
				cpu.registers.cir = cpu.registers.mdr;
				cpu.updateValues();
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#reg_mdr,#reg_cir').forEach(element => element.classList.add('active'));
				break;
			
			case 4:
				setState(5,"Fetch", "The *Control Unit* increments the *Program Counter*");
				cpu.registers.pc++;
				cpu.updateValues();
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#reg_pc').forEach(element => element.classList.add('active'));
				break;
			
			
			case 5:
				setState(6, "Decode", "The *Decode Unit* breaks the value in the *Current Instruction Register* into the *opcode* and *operand*."); 
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#reg_cir,.decode_unit table').forEach(element => element.classList.add('active'));
				break;
				
			case 6:
				var opcode = ((cpu.registers.cir & 0xfff) >> 8);
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelector('.decode_row_' + opcode).classList.add('active');
				switch(opcode) {
					case 0:
						setState(7, "Decode", "The *opcode* 0000 means end the program");
					break;
					case 4:
						setState(16, "Decode", "The *opcode* 0100 means reset the value stored at the memory address specified by the *operand* to 0");
					break;
					
					case 1:
						setState(8, "Decode", "The *opcode* 0001 means add the value in the *Accumulator* register to the data stored in memory at the address specified by the *operand*");
					break;
					
					case 2:
						setState(9, "Decode", "The *opcode* 0010 means subtract the value stored in memory at the address specified by the *operand* from the value in the *Accumulator* register");
					break;
					
					case 3:
						setState(10, "Decode", "The *opcode* 0011 means store the value in the *Accumulator* register into memory at the address specified by the *operand*");
					break;
					
					case 5:
						setState(11, "Decode", "The *opcode* 0101 means load the value from memory (at the address specified by the *operand*) into the *Accumulator* register");
					break;
					
					case 6:
						setState(12, "Decode", "The *opcode* 0110 means branch (unconditionally)");
					break;
					
					case 7:
						setState(13, "Decode", "The *opcode* 0111 means branch if the *Accumulator* stores a value equal to 0");
					break;
					
					case 8:
						setState(14, "Decode", "The *opcode* 1000 means branch if the *Accumulator* stores a value greater or equal to 0 (not negative)");
					break;
					
					case 9:
						setState(15, "Decode", "The *opcode* 1001 means either input or output, depending on the *operand*");
					break;
					case 10:
						setState(17, "Decode", "The *opcode* 1010 means increment the *Accumulator* by the value in the *operand*");
					break;
					case 11:
						setState(18, "Decode", "The *opcode* 1011 means decrement the *Accumulator* by the value in the *operand*");
					break;
					case 12:
						setState(19, "Decode", "The *opcode* 1100 means set the *Accumulator* to the value in the *operand*");
					break;
					case 13:
						setState(131, "Decode", "The *opcode* 1101 means load the value from the address stored at the address specified by the *operand*");
					break;
					case 14:
						setState(141, "Decode", "The *opcode* 1110 means store the *Accumulator* at the address stored at the address specified by the *operand*");
					break;
					
					
				}
				break;
			
			case 7:
				setState(7, "Execute", "The CPU has halted so the *Control Unit* doesn't fetch any more instructions");
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				cpu.running = false;
				break;
				
			case 8: //The *opcode* 0001 means add the value in the *Accumulator* register to the data stored in memory at the address specified by the *operand*"
				setState(81, "Decode", "The *Decode Unit* sends the *operand* to the *Memory Address Register* which gets copied onto the *Address Bus*");
				cpu.registers.mar = cpu.registers.cir & 0xFF;
				cpu.updateValues();
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#reg_mar,.decode_row_1').forEach(element => element.classList.add('active'));
			break;
			
			case 81: 
				setState(82, "Execute", "The *Control Unit* tells the memory store to look at the address on the *Address Bus* and place that value on the *Data Bus*");
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelector('#ram_value_' + cpu.registers.mar).classList.add('active');
				break;
			case 82:
				setState(83, "Execute", "The *Control Unit* copies the value on the *Data Bus* into the *Memory Data Register*");
				cpu.registers.mdr = cpu.ram[cpu.registers.mar];
				cpu.updateValues();
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#reg_mdr').forEach(element => element.classList.add('active'));
				break;
			case 83:
				setState(0, "Execute", "The *opcode* and *Control Unit* signals the *Arithmetic Logic Unit* to add the values stored in the *Accumulator* and *Memory Data Register*s. The result gets saved back in the *Accumulator* register.");
				cpu.registers.acc += cpu.registers.mdr;
				cpu.updateValues();
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#reg_mdr,#alu,#acc').forEach(element => element.classList.add('active'));
			break;
			
			
			case 9: //"The *opcode* 0010 means subtract the value stored in memory at the address specified by the *operand* from the value in the *Accumulator* register"
				setState(91, "Decode", "The *Decode Unit* sends the *opcode* to the *Memory Address Register* which gets copied onto the *Address Bus*");
				cpu.registers.mar = cpu.registers.cir & 0xFF;
				cpu.updateValues();
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#reg_mar').forEach(element => element.classList.add('active'));
			break;
			
			case 91: 
				setState(92, "Execute", "The *Control Unit* tells the memory store to look at the address on the *Address Bus* and place that value on the *Data Bus*");
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelector('#ram_value_' + cpu.registers.mar).classList.add('active');
				break;
			case 92:
				setState(93, "Execute", "The *Control Unit* copies the value on the *Data Bus* into the *Memory Data Register*");
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#reg_mdr').forEach(element => element.classList.add('active'));
				cpu.registers.mdr = cpu.ram[cpu.registers.mar];
				cpu.updateValues();
				break;
			case 93:
				setState(0, "Execute", "The *opcode* and *Control Unit* signals the *Arithmetic Logic Unit* to subtract the values stored in the *Memory Data Register* from the value stored in the *Accumulator* register. The result gets saved back in the *Accumulator* register.");
				cpu.registers.acc = cpu.registers.acc - cpu.registers.mdr;
				cpu.updateValues();
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#alu,#reg_acc,#reg_mdr').forEach(element => element.classList.add('active'));
			break;
			
			
			
			case 10: //"The *opcode* 0011 means store the value in the *Accumulator* register into memory at the address specified by the *operand*"
				setState(101, "Decode", "The *opcode* and *Control Unit* sends the value stored in the *Accumulator* register to the *Memory Data Register* which gets copied on to the *Data Bus*");
				cpu.registers.mdr = cpu.registers.acc;
				cpu.updateValues();
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#reg_acc,#reg_mdr').forEach(element => element.classList.add('active'));
				break;
			case 101:
				setState(102, "Decode", "The *Decode Unit* sends the *operand* to the *Memory Address Register* which gets copied onto the *Address Bus*");
				cpu.registers.mar = cpu.registers.cir & 0xFF;
				cpu.updateValues();
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#reg_mar').forEach(element => element.classList.add('active'));
			break;
			case 102: 
				setState(0, "Execute", "The *Control Unit* tells the memory store to store the value on the *Data Bus* into the address on the *Address Bus*");
				cpu.ram[cpu.registers.mar] = cpu.registers.mdr;
				cpu.updateValues();
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelector('#ram_value_' + cpu.registers.mar).classList.add('active');
				break;

			case 16:
				setState(161, "Decode", "The *Decode Unit* sends the *operand* to the *Memory Address Register*");
				cpu.registers.mar = cpu.registers.cir & 0xFF;
				cpu.updateValues();
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#reg_mar,.decode_row_4').forEach(element => element.classList.add('active'));
				break;
			case 161:
				setState(162, "Execute", "The *Control Unit* places 0 in the *Memory Data Register*");
				cpu.registers.mdr = 0;
				cpu.updateValues();
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#reg_mdr').forEach(element => element.classList.add('active'));
				break;
			case 162:
				setState(20, "Execute", "The *Control Unit* stores 0 from the *Memory Data Register* in memory at the address in the *Memory Address Register*");
				cpu.ram[cpu.registers.mar] = cpu.registers.mdr;
				cpu.updateValues();
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#reg_mar,#reg_mdr,#ram_value_' + cpu.registers.mar).forEach(element => element.classList.add('active'));
				break;
			
			case 11: //"The *opcode* 0101 means load the value from memory (at the address specified by the *operand*) into the *Accumulator* register"
				setState(111, "Decode", "The *Decode Unit* sends the *operand* to the *Memory Address Register* which gets copied onto the *Address Bus*");
				cpu.registers.mar = cpu.registers.cir & 0xFF;
				cpu.updateValues();
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#reg_mar').forEach(element => element.classList.add('active'));
			break;
			
			case 111: 
				setState(112, "Execute", "The *Control Unit* tells the memory store to look at the address on the *Address Bus* and place that value on the *Data Bus*");
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelector('#ram_value_' + cpu.registers.mar).classList.add('active');
				break;
			case 112:
				setState(113, "Execute", "The *Control Unit* copies the value on the *Data Bus* into the *Memory Data Register*");
				cpu.registers.mdr = cpu.ram[cpu.registers.mar];
				cpu.updateValues();
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#reg_mdr').forEach(element => element.classList.add('active'));
				break;
			case 113:
				setState(20, "Execute", "The *opcode* and *Control Unit* sends the value in the *Memory Data Register* to the *Accumulator* register.");
				cpu.registers.acc = cpu.registers.mdr;
				cpu.updateValues();
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#reg_mdr,#reg_acc').forEach(element => element.classList.add('active'));
			break;
			
			case 12://The *opcode* 0110 means branch (unconditionally)
				setState(20, "Execute", "The *operand* gets stored in the *Program Counter*");
				cpu.registers.pc = cpu.registers.cir & 0xFF;
				cpu.updateValues();
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#reg_pc').forEach(element => element.classList.add('active'));
			break;
			
			case 13://The *opcode* 0111 means branch if the *Accumulator* stores a value equal to 0
				setState(20, "Execute", "The *Control Unit* and *opcode* makes the *Arithmetic Logic Unit* check to see if the *Accumulator* register contains a zero. If it does, the *operand* gets copied into the *Program Counter* register");
				if(cpu.registers.acc == 0)
					cpu.registers.pc = cpu.registers.cir & 0xFF;
				cpu.updateValues();
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#reg_acc,#reg_pc,#alu').forEach(element => element.classList.add('active'));
			break;
			
			case 14://The *opcode* 1000 means branch if the *Accumulator* stores a value greater than or equal to 0"
				setState(20, "Execute", "The *Control Unit* and *opcode* makes the *Arithmetic Logic Unit* check to see if the *Accumulator* register contains a value greater than zero. If it does, the *operand* gets copied into the *Program Counter* register");
				if(cpu.registers.acc >= 0)
					cpu.registers.pc = cpu.registers.cir & 0xFF;
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				cpu.updateValues();
				document.querySelectorAll('#alu,#reg_acc,#reg_pc').forEach(element => element.classList.add('active'));
			break;
			
			case 15://The *opcode* 1001 means either input or output, depending on the *operand*"
				if((cpu.registers.cir & 0xFF) == 1) {
					setState(20, "Execute", "The *opcode* 0001 and the *Control Bus* reads from the input device and places the input value into the *Accumulator* register");
					cpu.registers.acc = parseInt(prompt("Enter decimal input value:")) & 0xFF;
					cpu.updateValues();
					document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
					document.querySelectorAll('#reg_acc').forEach(element => element.classList.add('active'));
					if(cpu.instructionMode) cpu.state = 0;
				}
				if((cpu.registers.cir & 0xFF) == 2) {
					setState(20, "Execute", "The *opcode* 0010 and the *Control Bus* causes the value of the *Accumulator* register to be sent to the output device");
					alert("Output: " + cpu.registers.acc);
					document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
					document.querySelectorAll('#reg_acc').forEach(element => element.classList.add('active'));
					if(cpu.instructionMode) cpu.state = 0;
				}
			break;

			case 20:
				setState(0, "Execute", "The *Control Unit* checks for interrupts and either branches to the relevant interrupt service routine or starts the cycle again.");
				break;
			case 17:
				setState(20, "Execute", "The *Control Unit* increments the *Accumulator* by the value in the *operand*");
				cpu.registers.acc += cpu.registers.cir & 0xFF;
				cpu.updateValues();
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#reg_acc,#alu').forEach(element => element.classList.add('active'));
				break;
			case 18:
				setState(20, "Execute", "The *Control Unit* decrements the *Accumulator* by the value in the *operand*");
				cpu.registers.acc -= cpu.registers.cir & 0xFF;
				cpu.updateValues();
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#reg_acc,#alu').forEach(element => element.classList.add('active'));
				break;
			case 19:
				setState(20, "Execute", "The *Control Unit* sets the *Accumulator* to the value in the *operand*");
				cpu.registers.acc = cpu.registers.cir & 0xFF;
				cpu.updateValues();
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#reg_acc,#alu').forEach(element => element.classList.add('active'));
				break;
			case 131:
				setState(132, "Decode", "The *Decode Unit* sends the pointer address in the *operand* to the *Memory Address Register*");
				cpu.registers.mar = cpu.registers.cir & 0xFF;
				cpu.updateValues();
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#reg_mar,.decode_row_13').forEach(element => element.classList.add('active'));
				break;
			case 132:
				setState(133, "Execute", "The *Control Unit* reads the target address stored in memory into the *Memory Data Register*");
				cpu.registers.mdr = cpu.ram[cpu.registers.mar];
				cpu.updateValues();
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#reg_mdr,#ram_value_' + cpu.registers.mar).forEach(element => element.classList.add('active'));
				break;
			case 133:
				setState(134, "Execute", "The *Control Unit* copies the indirect address from the *Memory Data Register* to the *Memory Address Register*");
				cpu.registers.mar = cpu.registers.mdr;
				cpu.updateValues();
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#reg_mdr,#reg_mar').forEach(element => element.classList.add('active'));
				break;
			case 134:
				setState(135, "Execute", "The *Control Unit* performs a second memory read, loading the value at the indirect address into the *Memory Data Register*");
				cpu.registers.mdr = cpu.ram[cpu.registers.mar];
				cpu.updateValues();
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#reg_mdr,#ram_value_' + cpu.registers.mar).forEach(element => element.classList.add('active'));
				break;
			case 135:
				setState(20, "Execute", "The *Control Unit* copies the value in the *Memory Data Register* to the *Accumulator*");
				cpu.registers.acc = cpu.registers.mdr;
				cpu.updateValues();
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#reg_mdr,#reg_acc').forEach(element => element.classList.add('active'));
				break;
			case 141:
				setState(142, "Decode", "The *Decode Unit* sends the pointer address in the *operand* to the *Memory Address Register*");
				cpu.registers.mar = cpu.registers.cir & 0xFF;
				cpu.updateValues();
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#reg_mar,.decode_row_14').forEach(element => element.classList.add('active'));
				break;
			case 142:
				setState(143, "Execute", "The *Control Unit* reads the target address stored in memory into the *Memory Data Register*");
				cpu.registers.mdr = cpu.ram[cpu.registers.mar];
				cpu.updateValues();
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#reg_mdr,#ram_value_' + cpu.registers.mar).forEach(element => element.classList.add('active'));
				break;
			case 143:
				setState(144, "Execute", "The *Control Unit* copies the indirect address from the *Memory Data Register* to the *Memory Address Register*");
				cpu.registers.mar = cpu.registers.mdr;
				cpu.updateValues();
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#reg_mdr,#reg_mar').forEach(element => element.classList.add('active'));
				break;
			case 144:
				setState(20, "Execute", "The *Control Unit* copies the *Accumulator* into the *Memory Data Register* and stores it at the indirect address");
				cpu.registers.mdr = cpu.registers.acc;
				cpu.ram[cpu.registers.mar] = cpu.registers.mdr;
				cpu.updateValues();
				document.querySelectorAll('.active').forEach(element => element.classList.remove('active'));
				document.querySelectorAll('#reg_acc,#reg_mdr,#reg_mar,#ram_value_' + cpu.registers.mar).forEach(element => element.classList.add('active'));
				break;
			
			
		}
		if(cpu.running) {
			cpu.nextTimeout = setTimeout(cpu.step, cpu.runDelay);
		}
	},

	stepInstruction: function() {
		if(cpu.running && cpu.nextTimeout) {
			clearTimeout(cpu.nextTimeout);
			cpu.nextTimeout = 0;
		}
		cpu.running = false;
		cpu.instructionMode = true;

		try {
			if(cpu.state === 20) {
				cpu.step();
			}

			if(cpu.state === 7) {
				return;
			}

			do {
				cpu.step();
			} while(cpu.state !== 0 && cpu.state !== 7);
		} finally {
			cpu.instructionMode = false;
		}
	},
	
	state: 0,
	
	running: false,

	instructionMode: false,
	
	nextTimeout: 0,
	
	runDelay: 1000,
	
	showHint: function(html) {
		document.querySelector('#hint_text').innerHTML = html;
	},
	
	jqCPU: null,
	
	ram: [],
	
	pad: function(val, length) {
		return pad(val, length);
	},
	
	hex2bin: function(hex) {
		return hex2bin(hex);
	},
	
	bin2hex: function(bin) {
		return bin2hex(bin);
	},
	
	bin2dec: function(bin) {
		return bin2dec(bin);
	},

	bin2dec12: function(bin) {
		return bin2dec12(bin);
	},
	
	dec2bin: function(dec) {
		return dec2bin(dec);
	},

	dec2bin12: function(dec) {
		return dec2bin12(dec);
	},

	hex2dec: function(hex) {
		return hex2dec(hex);
	},

	hex2dec12: function(hex) {
		return hex2dec12(hex);
	},

	dec2hex: function(dec) {
		return dec2hex(dec);
	},

	dec2hex12: function(dec) {
		return dec2hex12(dec);
	},

	compileProgram: function(source, startAddress) {
		return compileProgram(source, startAddress);
	},
	
	updateValues: function() {
		var regNames = Object.keys(cpu.registers);
		
		function writeValue(val, element) {
			if(element.classList.contains("value_binary")) {
				val = element.classList.contains("value_12") ? cpu.dec2bin12(val) : cpu.dec2bin(val);
			}
			if(element.classList.contains("value_hex")) {
				val = element.classList.contains("value_12") ? cpu.dec2hex12(val) : cpu.dec2hex(val);
			}
			element.textContent = val;
		}
		
		cpu.updateRegisterValues();
		for(var i = 0; i < cpu.ram.length; i++) {
			writeValue(cpu.ram[i], document.querySelector('#ram_value_' + i));
		}
	},

	updateRegisterValues: function() {
		var regNames = Object.keys(cpu.registers);

		function writeValue(val, element) {
			if(element.classList.contains("value_binary")) {
				val = element.classList.contains("value_12") ? cpu.dec2bin12(val) : cpu.dec2bin(val);
			}
			if(element.classList.contains("value_hex")) {
				val = element.classList.contains("value_12") ? cpu.dec2hex12(val) : cpu.dec2hex(val);
			}
			element.textContent = val;
		}

		for(var i = 0; i < regNames.length; i++) {
			var val = cpu.registers[regNames[i]];
			var element = document.querySelector('#reg_' + regNames[i] + "_val");
			writeValue(val, element);
		}
	},
	
	registers: {
		acc: 0,
		pc: 0,
		mar: 0,
		mdr: 0,
		cir: 0
	},
	
	updateAnnotations: function() {
		var d = document.querySelector('#drawing');
		d.innerHTML = "";
		var w = d.clientWidth;
		var h = d.clientHeight;
		var paper = Raphael("drawing", w, h);
		paper.clear();

		function connect(from, to, attributes, label, labelAttributes) {

			function getX(i, a) {
				switch(a){
					case 'left':
						return i.offsetLeft;
					break;
					case 'right':
						var style = getComputedStyle(i);
						return i.offsetLeft + i.offsetWidth + (parseFloat(style.marginLeft) || 0) + (parseFloat(style.marginRight) || 0);
					break;
					case 'middle':
						var style = getComputedStyle(i);
						var width = i.offsetWidth + (parseFloat(style.marginLeft) || 0) + (parseFloat(style.marginRight) || 0);
						return i.offsetLeft + (width / 2);
					break;
					default:
						var percentage = parseInt(a.replace("%", ""));
						var style = getComputedStyle(i);
						var width = i.offsetWidth + (parseFloat(style.marginLeft) || 0) + (parseFloat(style.marginRight) || 0);
						return i.offsetLeft + (width * percentage / 100);
					break;
				}
			}
			
			function getY(i, a) {
				switch(a) {
					case 'top':
						return i.offsetTop;
					break;
					case 'bottom':
						var style = getComputedStyle(i);
						return i.offsetTop + i.offsetHeight + (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0);
					break;
					case 'middle':
						var style = getComputedStyle(i);
						var height = i.offsetHeight + (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0);
						return i.offsetTop + (height / 2);
					break;
					default:
						var percentage = parseInt(a.replace("%", ""));
						var style = getComputedStyle(i);
						var height = i.offsetHeight + (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0);
						return i.offsetTop + (height * percentage / 100);
				}
			}
			var x1 = getX(from.e, from.h);
			var x2 = x1;
			if(to.h) {
				x2 = getX(to.e, to.h);
			}
			x2 += to.offsetX || 0;
			
			var y1 = getY(from.e, from.v);
			var y2 = y1;
			if(to.v) {
				y2 = getY(to.e, to.v);
			}
			
			var e = paper.path("M" + Math.floor(x1) + " " + Math.floor(y1) + "L" +  Math.floor(x2) + " " + Math.floor(y2));
			if(attributes === undefined) {
				attributes = {"stroke-width": 10, "arrow-end":"block-narrow-short"};
			}
			e.attr(attributes);
			
			if(label) {
				var x = Math.floor((x1 + x2) / 2);
				var y = Math.floor((y1 + y2) / 2);
				var text = paper.text(x, y, label);
				if(labelAttributes) {
					text.attr(labelAttributes);
				}
			}
		}
		
		var PC = document.querySelector('#reg_pc');
		var MAR = document.querySelector('#reg_mar');
		var decodeUnit = document.querySelector('.decode_unit');
		var MDR = document.querySelector('#reg_mdr');
		var CIR = document.querySelector('#reg_cir');
		var ALU = document.querySelector('#alu');
		var ACC = document.querySelector('#reg_acc');
		var CPU = document.querySelector('.cpu');
		var RAM = document.querySelector('.ram');
		
		connect({e:ALU, h:"left", v:"middle"}, {e:decodeUnit, h:"right"}, {"stroke-width": 10, "arrow-start":"block-narrow-short"});
		connect({e:PC, h:"right", v:"middle"}, {e:MAR, h:"left", v:"middle"});
		connect({e:decodeUnit, h:"60%", v:"top"}, {e:PC, v:"bottom"});
		connect({e:decodeUnit, h:"80%", v:"top"}, {e:MAR, h:"left", v:"bottom"});
		connect({e:MDR, h:"middle", v:"bottom"}, {e:CIR, h:"middle", v:"top"});
		connect({e:CIR, h:"left", v:"middle"}, {e:decodeUnit, h:"right"});
		connect({e:MDR, h:"20%", v:"top"}, {e:ALU, v:"bottom"});
		connect({e:ACC, h:"20%", v:"bottom"}, {e:ALU, v:"top"}, {"stroke-width": 10, "arrow-end":"block-narrow-short", "arrow-start": "block-narrow-short"});
		connect({e:MDR, h:"80%", v:"top"}, {e:ACC, h:"80%", v:"bottom"}, {"stroke-width": 10, "arrow-end":"block-narrow-short", "arrow-start": "block-narrow-short"});
		
		connect({e:CPU, h:"right", v:"5%"}, {e: RAM, h:"left", offsetX: -35}, {"stroke-width": 20, "stroke": "#F00", "arrow-end":"block-narrow-short"}, "Address bus");
		connect({e:CPU, h:"right", v:"56%"}, {e: RAM, h:"left", offsetX: -35}, {"stroke-width": 20, "stroke": "#F00", "arrow-end":"block-narrow-short", "arrow-start": "block-narrow-short"}, "Data bus");
		connect({e:CPU, h:"right", v:"85%"}, {e: RAM, h:"left", offsetX: -35}, {"stroke-width": 20, "stroke": "#F00", "arrow-end":"block-narrow-short", "arrow-start": "block-narrow-short"}, "Control bus");
	},
	
	init: function(cpuSelector) {
		window.addEventListener('resize', cpu.updateAnnotations);
		var sourceRadix = 'binary';
		var html ='<div id="drawing"></div><div class="ram"><h3><i class="fa fa-list"></i> RAM</h3>';
		html += '<table class="table table-fixed table-striped table-hover"><thead><tr><th>Address</th><th>Value</th></tr></thead>';
		var params = new URLSearchParams(window.location.search);
		var exampleName = params.get("program");
		var initialProgram = null;
		var programLoadError = null;
		if(exampleName !== null) {
			try {
				if(!Object.prototype.hasOwnProperty.call(examplePrograms, exampleName)) {
					throw new Error('Unknown example program "' + exampleName + '".');
				}
				initialProgram = examplePrograms[exampleName] ?
					cpu.compileProgram(examplePrograms[exampleName], 0) : [];
			} catch(error) {
				programLoadError = error.message;
			}
		}
		if(exampleName !== null && !programLoadError) {
			var compilerSource = document.querySelector('#compiler_source');
			compilerSource.value = examplePrograms[exampleName];
			compilerSource.setSelectionRange(0, 0);
			compilerSource.scrollTop = 0;
		}
		var ram = exampleName === null ? (params.get("ram") || "").match(/[0-9a-fA-F]{2}/g) : null;
		for(var address = 0; address < 256; address++) {
			cpu.ram[address] = initialProgram && initialProgram[address] !== undefined ? initialProgram[address] :
				ram && ram[address] ? cpu.hex2dec(ram[address]) : 0;
			html += '<tr><td id="ram_address_' + address + '" class="value value_denary">' + address + '</td><td id="ram_value_' + address + '" class="value value_denary value_12 editable" data-description="Memory address ' + address + '">' + cpu.ram[address] + '</td></tr>';
		}
		html += '</table>';
		html += '</div>';
		
		
		html += '<div class="cpu"><h3><i class="fa fa-microchip"></i> CPU</h3>';
		
		function getRegisterHtml(name, value, desc) {
			var wideClass = name === "MDR" || name === "CIR" ? " value_12" : "";
			return '<div class="register" id="reg_' + name.toLowerCase()+'"><div class="reg_name">' + name + '</div><div id="reg_' + name.toLowerCase() + '_val" class="reg_val value value_denary editable' + wideClass + '" data-description="' + desc + '">' + value + '</div></div>';
		}
		html += getRegisterHtml('PC', 0, "Program Counter");
		html += getRegisterHtml('MAR', 0, "Memory Address Register");
		html += getRegisterHtml('MDR', 0, "Memory Data Register");
		html += getRegisterHtml('ACC', 0, "Accumulator");
		html += getRegisterHtml('CIR', 0, "Current Instruction Register");
		
		html += '<div id="alu">ALU</div>';
		html += '<div id="cu">CU</div>';
		
		
		html += '<div class="decode_unit"><h4><i class="fa fa-info-circle"></i> Decode unit</h2>';
		html += '<table class="table table-fixed table-striped table-hover"><thead><tr><th>Opcode</th><th>Operand</th><th>Instruction</th><th>Mnemonic</th></tr></thead>';
		html += '<tr class="decode_row_0"><td>0000</td><td>0000</td><td>End</td><td>END</td></tr>';
		html += '<tr class="decode_row_1"><td>0001</td><td>address</td><td>Add</td><td>ADD</td></tr>';
		html += '<tr class="decode_row_2"><td>0010</td><td>address</td><td>Subtract</td><td>SUB</td></tr>';
		html += '<tr class="decode_row_3"><td>0011</td><td>address</td><td>Store</td><td>STORE</td></tr>';
		html += '<tr class="decode_row_4"><td>0100</td><td>address</td><td>Reset</td><td>RESET</td></tr>';
		html += '<tr class="decode_row_5"><td>0101</td><td>address</td><td>Load</td><td>LOAD</td></tr>';
		html += '<tr class="decode_row_6"><td>0110</td><td>address</td><td>Branch Always</td><td>BRANCH</td></tr>';
		html += '<tr class="decode_row_7"><td>0111</td><td>address</td><td>Branch if ACC = 0</td><td>BRANCHZERO</td></tr>';
		html += '<tr class="decode_row_8"><td>1000</td><td>address</td><td>Branch if ACC &gt;= 0</td><td>BRANCHPOS</td></tr>';
		html += '<tr class="decode_row_9"><td>1001</td><td>0001</td><td>Input</td><td>INPUT</td></tr>';
		html += '<tr class="decode_row_9"><td>1001</td><td>0010</td><td>Output</td><td>OUTPUT</td></tr>';
		html += '<tr class="decode_row_10"><td>1010</td><td>amount</td><td>Inc</td><td>INC</td></tr>';
		html += '<tr class="decode_row_11"><td>1011</td><td>amount</td><td>Dec</td><td>DEC</td></tr>';
		html += '<tr class="decode_row_12"><td>1100</td><td>value</td><td>Set</td><td>SET</td></tr>';
		html += '<tr class="decode_row_13"><td>1101</td><td>[address]</td><td>Load Indirect</td><td>LOAD</td></tr>';
		html += '<tr class="decode_row_14"><td>1110</td><td>[address]</td><td>Store Indirect</td><td>STORE</td></tr>';
		html += '</div>';
		
		html += '</div>';
		
		
		
		document.querySelector(cpuSelector).innerHTML = html;
		
		
		cpu.updateAnnotations();
		
		document.querySelector('#run_speed').addEventListener('change', function(event) {
			cpu.runDelay = event.currentTarget.value;
		});
		document.querySelector('#btn_examples').addEventListener('click', function() {
			showModal(document.querySelector('#modal_examples'));
		});
		document.querySelector('#btn_open_compiler').addEventListener('click', function() {
			showModal(document.querySelector('#modal_compiler'));
			var source = document.querySelector('#compiler_source');
			source.focus();
			source.setSelectionRange(0, 0);
			source.scrollTop = 0;
		});
		document.querySelectorAll('[data-native-dismiss="modal"]').forEach(function(button) {
			button.addEventListener('click', function() {
				hideModal(button.closest('.modal'));
			});
		});
		document.querySelectorAll('.modal').forEach(function(modal) {
			modal.addEventListener('click', function(event) {
				if(event.target === modal) hideModal(modal);
			});
			modal.addEventListener('keydown', function(event) {
				if(event.key === 'Escape') hideModal(modal);
			});
		});
		
		document.querySelector('#btn_reset_cpu').addEventListener('click', function() {
			cpu.state = 0;
			cpu.registers.acc = cpu.registers.cir = cpu.registers.mar = cpu.registers.mdr = cpu.registers.pc = 0;
			cpu.showHint("CPU registers and execution state reset to zero")
			document.querySelectorAll('.current_instruction').forEach(element => element.classList.remove('current_instruction'));
			cpu.updateRegisterValues();
		});
		
		document.querySelector('#btn_share').addEventListener('click', function() {
			document.querySelectorAll('#st-2').forEach(element => element.classList.toggle('st-hidden'));
		});
		
		setTimeout(function() {
			document.querySelectorAll('#st-2').forEach(element => element.classList.add('st-hidden'));
		}, 5000);
		
		document.querySelector('#btn_reset_ram').addEventListener('click', function() {
			cpu.showHint("All memory store values set to zero");
			for(var address = 0; address < 256; address++) {
				cpu.ram[address] = 0;
			}
			cpu.updateValues();
		});

		function compileProgramToOutput(loadIntoRam) {
			var status = document.querySelector('#compiler_status');
			status.classList.remove('text-danger', 'text-success');
			try {
				var startAddress = parseInt(document.querySelector('#compiler_address').value, 10);
				var bytes = cpu.compileProgram(document.querySelector('#compiler_source').value, startAddress);
				var outputFormat = document.querySelector('#compiler_format').value;
				var output = [];
				for(var i = 0; i < bytes.length; i++) {
					output.push(outputFormat === 'hex' ? cpu.dec2hex12(bytes[i]) : cpu.dec2bin12(bytes[i]));
				}
				document.querySelector('#compiler_output').value = output.join(outputFormat === 'hex' ? ' ' : '\n');

				if(loadIntoRam && document.querySelector('#compiler_load').checked) {
					if(startAddress + bytes.length > cpu.ram.length) {
						throw new Error('The program does not fit in RAM from that address.');
					}
					for(var address = 0; address < bytes.length; address++) {
						cpu.ram[startAddress + address] = bytes[address];
					}
					cpu.registers.pc = startAddress;
					cpu.state = 0;
					cpu.running = false;
					cpu.updateValues();
					status.classList.add('text-success');
					status.textContent = 'Compiled and loaded into RAM.';
				} else {
					status.classList.add('text-success');
					status.textContent = 'Compilation complete.';
				}
			} catch(error) {
				status.classList.add('text-danger');
				status.textContent = error.message;
			}
		}

		document.querySelector('#btn_compile').addEventListener('click', function() {
			compileProgramToOutput(true);
		});

		document.querySelector('#compiler_format').addEventListener('change', function() {
			compileProgramToOutput(false);
		});
		
		document.querySelectorAll('.value.editable').forEach(function(element) {
			element.addEventListener('click', function(event) {
				var target = event.currentTarget;
				document.querySelector('#modal_change_value_title').textContent = target.dataset.description;
				document.querySelector('#change_value_from').textContent = target.textContent;
				document.querySelector('#change_value_to').value = target.textContent;
				cpu.lastChangedValue = target.id;
				showModal(document.querySelector('#modal_change_value'));
				document.querySelector('#change_value_to').focus();
				document.querySelector('#change_value_to').select();
			});
		});
		
		document.querySelector('#btn_change_value_ok').addEventListener('click', function() {
			function getInt(element, val) {
				if(element.classList.contains('value_hex')) {
					return element.classList.contains('value_12') ? cpu.hex2dec12(val) : cpu.hex2dec(val);
				}
				if(element.classList.contains('value_binary')) {
					return element.classList.contains('value_12') ? cpu.bin2dec12(val) : cpu.bin2dec(val);
				}
				if(element.classList.contains('value_12')) {
					return parseInt(val, 10) & 0xFFF;
				}
				val = parseInt(val, 10) & 0xFF;
				return val >= 128? val - 256: val;
			}
			
			var element = document.querySelector('#' + cpu.lastChangedValue);
			var value = document.querySelector('#change_value_to').value;
			var parts = cpu.lastChangedValue.split("_");
			switch(parts[0]) {
				case 'ram':
					var address = parseInt(parts[2]);
					cpu.ram[address] = getInt(element, value);
				break;
				case 'reg':
					var reg = parts[1];
					cpu.registers[reg] = getInt(element, value);
				break;
				
			}
			cpu.updateValues();
		});
		
		document.querySelector('#btn_step').addEventListener('click', cpu.step);
		document.querySelector('#btn_step_instruction').addEventListener('click', cpu.stepInstruction);
		
		document.querySelector('#btn_run').addEventListener('click', function() {
			if(cpu.running && cpu.nextTimeout) {
				clearTimeout(cpu.nextTimeout);
			} else {
				cpu.running = true;
				cpu.step();
			}
		});
		
		document.querySelector('#btn_toggle_hint').addEventListener('click', function() {
			document.querySelectorAll('#hint').forEach(element => element.classList.toggle('hint-hidden'));
		});
		
		document.querySelectorAll('#btn_values_binary, #btn_values_denary, #btn_values_hex').forEach(function(button) {
			button.addEventListener('click', function(e) {
				var mode = e.currentTarget.id.split("_")[2];
				var source = document.querySelector('#compiler_source');
				if(sourceRadix !== mode) {
					source.value = convertSourceOperands(source.value, sourceRadix, mode);
					source.setSelectionRange(0, 0);
					source.scrollTop = 0;
					sourceRadix = mode;
				}
				document.querySelectorAll('.value').forEach(function(element) {
					var val = element.textContent;
					if(element.classList.contains("value_binary")) {
						val = element.classList.contains("value_12") ? cpu.bin2dec12(val) : parseInt(val, 2);
					}
					if(element.classList.contains("value_denary")) {
						val = parseInt(val, 10);
					}
					if(element.classList.contains("value_hex")) {
						val = element.classList.contains("value_12") ? cpu.hex2dec12(val) : parseInt(val, 16);
					}
					switch(mode) {
						case 'binary':
							element.textContent = element.classList.contains("value_12") ? cpu.dec2bin12(val) : cpu.dec2bin(val);
							break;
						case 'hex':
							element.textContent = element.classList.contains("value_12") ? cpu.dec2hex12(val) : cpu.dec2hex(val);
							break;
						case 'denary':
							element.textContent = val;
					}
					element.classList.remove("value_binary", "value_denary", "value_hex");
					element.classList.add("value_" + mode);
				});
			});
		});
		document.querySelector('#btn_values_binary').click();
		if(programLoadError) {
			cpu.showHint("Could not load program: " + programLoadError);
		}
	}
};
window.cpu = cpu;
export { cpu };
function initializeCpu() {
	cpu.init("#cpu");
}

if(document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initializeCpu, { once: true });
} else {
	initializeCpu();
}
