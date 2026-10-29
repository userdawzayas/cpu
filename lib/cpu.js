import { compileProgram } from "./assembler.mjs";
import { bin2dec, bin2hex, dec2bin, dec2hex, hex2bin, hex2dec, pad } from "./number-format.mjs";

function dom(selector) {
	if(typeof selector === "function") {
		if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", selector, { once: true });
		else selector();
		return dom(null);
	}
	var elements = typeof selector === "string" ? Array.from(document.querySelectorAll(selector)) :
		(selector && selector.nodeType === 1) || selector === window ? [selector] : [];
	var collection = {
		removeClass: function(names) {
			var classes = names.split(/\s+/);
			elements.forEach(function(element) { element.classList.remove.apply(element.classList, classes); });
			return collection;
		},
		addClass: function(names) {
			var classes = names.split(/\s+/);
			elements.forEach(function(element) { element.classList.add.apply(element.classList, classes); });
			return collection;
		},
		hasClass: function(name) {
			return !!elements[0] && elements[0].classList.contains(name);
		},
		toggleClass: function(name) {
			elements.forEach(function(element) { element.classList.toggle(name); });
			return collection;
		},
		text: function(value) {
			if(value === undefined) return elements[0] ? elements[0].textContent : "";
			elements.forEach(function(element) { element.textContent = value; });
			return collection;
		},
		html: function(value) {
			if(value === undefined) return elements[0] ? elements[0].innerHTML : "";
			elements.forEach(function(element) { element.innerHTML = value; });
			return collection;
		},
		width: function() { return elements[0] ? elements[0].clientWidth : 0; },
		height: function() { return elements[0] ? elements[0].clientHeight : 0; },
		position: function() { return elements[0] ? { left: elements[0].offsetLeft, top: elements[0].offsetTop } : { left: 0, top: 0 }; },
		outerWidth: function(includeMargin) {
			if(!elements[0]) return 0;
			var style = getComputedStyle(elements[0]);
			return elements[0].offsetWidth + (includeMargin ? (parseFloat(style.marginLeft) || 0) + (parseFloat(style.marginRight) || 0) : 0);
		},
		outerHeight: function(includeMargin) {
			if(!elements[0]) return 0;
			var style = getComputedStyle(elements[0]);
			return elements[0].offsetHeight + (includeMargin ? (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0) : 0);
		},
		val: function(value) {
			if(value === undefined) return elements[0] ? elements[0].value : undefined;
			elements.forEach(function(element) { element.value = value; });
			return collection;
		},
		is: function(selectorText) { return !!elements[0] && elements[0].matches(selectorText); },
		data: function(name) { return elements[0] ? elements[0].dataset[name] : undefined; },
		focus: function() { if(elements[0]) elements[0].focus(); return collection; },
		select: function() { if(elements[0] && elements[0].select) elements[0].select(); return collection; },
		each: function(callback) {
			elements.forEach(function(element, index) { callback.call(element, index, element); });
			return collection;
		},
		on: function(eventName, callback) {
			var eventType = eventName.split(".")[0];
			elements.forEach(function(element) { element.addEventListener(eventType, callback); });
			return collection;
		},
		resize: function(callback) { return bind("resize", callback); },
		click: function(callback) { return bind("click", callback); },
		change: function(callback) { return bind("change", callback); },
		trigger: function(eventName) {
			elements.forEach(function(element) {
				if(eventName === "click" && element.click) element.click();
				else element.dispatchEvent(new Event(eventName));
			});
			return collection;
		}
	};

	function bind(eventName, callback) {
		elements.forEach(function(element) { element.addEventListener(eventName, callback); });
		return collection;
	}

	return collection;
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
				dom('.active').removeClass('active');
				dom('#reg_pc,#reg_mar').addClass('active');
				dom('.current_instruction').removeClass('current_instruction');
				dom('#ram_address_' + cpu.registers.pc).addClass('current_instruction');
				break;
			case 1:
				setState(2, "Fetch", "The *Control Unit* tells the memory store to look at the address on the *Address Bus* and load the value stored there onto the *Data Bus*");
				dom('.active').removeClass('active');
				dom('#ram_value_' + cpu.registers.mar).addClass('active');
			break;
			
			case 2:
				setState(3, "Fetch", "The *Control Unit* stores the value on the *Data Bus* into the *Memory Data Register*");
				cpu.registers.mdr = cpu.ram[cpu.registers.mar];
				cpu.updateValues();
				dom('.active').removeClass('active');
				dom('#reg_mdr').addClass('active');
				break;
				
			case 3:
				setState(4, "Fetch", "The *Control Unit* copies the value from the *Memory Data Register* into the *Current Instruction Register*");
				cpu.registers.cir = cpu.registers.mdr;
				cpu.updateValues();
				dom('.active').removeClass('active');
				dom('#reg_mdr,#reg_cir').addClass('active');
				break;
			
			case 4:
				setState(5,"Fetch", "The *Control Unit* increments the *Program Counter*");
				cpu.registers.pc++;
				cpu.updateValues();
				dom('.active').removeClass('active');
				dom('#reg_pc').addClass('active');
				break;
			
			
			case 5:
				setState(6, "Decode", "The *Decode Unit* breaks the value in the *Current Instruction Register* into the *opcode* and *operand*."); 
				dom('.active').removeClass('active');
				dom('#reg_cir,.decode_unit table').addClass('active');
				break;
				
			case 6:
				var opcode = ((cpu.registers.cir & 0xff) >> 4);
				dom('.active').removeClass('active');
				dom('.decode_row_' + opcode).addClass('active');
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
					
					
				}
				break;
			
			case 7:
				setState(7, "Execute", "The CPU has halted so the *Control Unit* doesn't fetch any more instructions");
				dom('.active').removeClass('active');
				cpu.running = false;
				break;
				
			case 8: //The *opcode* 0001 means add the value in the *Accumulator* register to the data stored in memory at the address specified by the *operand*"
				setState(81, "Decode", "The *Decode Unit* sends the *operand* to the *Memory Address Register* which gets copied onto the *Address Bus*");
				cpu.registers.mar = cpu.registers.cir & 0x0F;
				cpu.updateValues();
				dom('.active').removeClass('active');
				dom('#reg_mar,.decode_row_1').addClass('active');
			break;
			
			case 81: 
				setState(82, "Execute", "The *Control Unit* tells the memory store to look at the address on the *Address Bus* and place that value on the *Data Bus*");
				dom('.active').removeClass('active');
				dom('#ram_value_' + cpu.registers.mar).addClass('active');
				break;
			case 82:
				setState(83, "Execute", "The *Control Unit* copies the value on the *Data Bus* into the *Memory Data Register*");
				cpu.registers.mdr = cpu.ram[cpu.registers.mar];
				cpu.updateValues();
				dom('.active').removeClass('active');
				dom('#reg_mdr').addClass('active');
				break;
			case 83:
				setState(0, "Execute", "The *opcode* and *Control Unit* signals the *Arithmetic Logic Unit* to add the values stored in the *Accumulator* and *Memory Data Register*s. The result gets saved back in the *Accumulator* register.");
				cpu.registers.acc += cpu.registers.mdr;
				cpu.updateValues();
				dom('.active').removeClass('active');
				dom('#reg_mdr,#alu,#acc').addClass('active');
			break;
			
			
			case 9: //"The *opcode* 0010 means subtract the value stored in memory at the address specified by the *operand* from the value in the *Accumulator* register"
				setState(91, "Decode", "The *Decode Unit* sends the *opcode* to the *Memory Address Register* which gets copied onto the *Address Bus*");
				cpu.registers.mar = cpu.registers.cir & 0x0F;
				cpu.updateValues();
				dom('.active').removeClass('active');
				dom('#reg_mar').addClass('active');
			break;
			
			case 91: 
				setState(92, "Execute", "The *Control Unit* tells the memory store to look at the address on the *Address Bus* and place that value on the *Data Bus*");
				dom('.active').removeClass('active');
				dom('#ram_value_' + cpu.registers.mar).addClass('active');
				break;
			case 92:
				setState(93, "Execute", "The *Control Unit* copies the value on the *Data Bus* into the *Memory Data Register*");
				dom('.active').removeClass('active');
				dom('#reg_mdr').addClass('active');
				cpu.registers.mdr = cpu.ram[cpu.registers.mar];
				cpu.updateValues();
				break;
			case 93:
				setState(0, "Execute", "The *opcode* and *Control Unit* signals the *Arithmetic Logic Unit* to subtract the values stored in the *Memory Data Register* from the value stored in the *Accumulator* register. The result gets saved back in the *Accumulator* register.");
				cpu.registers.acc = cpu.registers.acc - cpu.registers.mdr;
				cpu.updateValues();
				dom('.active').removeClass('active');
				dom('#alu,#reg_acc,#reg_mdr').addClass('active');
			break;
			
			
			
			case 10: //"The *opcode* 0011 means store the value in the *Accumulator* register into memory at the address specified by the *operand*"
				setState(101, "Decode", "The *opcode* and *Control Unit* sends the value stored in the *Accumulator* register to the *Memory Data Register* which gets copied on to the *Data Bus*");
				cpu.registers.mdr = cpu.registers.acc;
				cpu.updateValues();
				dom('.active').removeClass('active');
				dom('#reg_acc,#reg_mdr').addClass('active');
				break;
			case 101:
				setState(102, "Decode", "The *Decode Unit* sends the *operand* to the *Memory Address Register* which gets copied onto the *Address Bus*");
				cpu.registers.mar = cpu.registers.cir & 0x0F;
				cpu.updateValues();
				dom('.active').removeClass('active');
				dom('#reg_mar').addClass('active');
			break;
			case 102: 
				setState(0, "Execute", "The *Control Unit* tells the memory store to store the value on the *Data Bus* into the address on the *Address Bus*");
				cpu.ram[cpu.registers.mar] = cpu.registers.mdr;
				cpu.updateValues();
				dom('.active').removeClass('active');
				dom('#ram_value_' + cpu.registers.mar).addClass('active');
				break;

			case 16:
				setState(161, "Decode", "The *Decode Unit* sends the *operand* to the *Memory Address Register*");
				cpu.registers.mar = cpu.registers.cir & 0x0F;
				cpu.updateValues();
				dom('.active').removeClass('active');
				dom('#reg_mar,.decode_row_4').addClass('active');
				break;
			case 161:
				setState(162, "Execute", "The *Control Unit* places 0 in the *Memory Data Register*");
				cpu.registers.mdr = 0;
				cpu.updateValues();
				dom('.active').removeClass('active');
				dom('#reg_mdr').addClass('active');
				break;
			case 162:
				setState(20, "Execute", "The *Control Unit* stores 0 from the *Memory Data Register* in memory at the address in the *Memory Address Register*");
				cpu.ram[cpu.registers.mar] = cpu.registers.mdr;
				cpu.updateValues();
				dom('.active').removeClass('active');
				dom('#reg_mar,#reg_mdr,#ram_value_' + cpu.registers.mar).addClass('active');
				break;
			
			case 11: //"The *opcode* 0101 means load the value from memory (at the address specified by the *operand*) into the *Accumulator* register"
				setState(111, "Decode", "The *Decode Unit* sends the *operand* to the *Memory Address Register* which gets copied onto the *Address Bus*");
				cpu.registers.mar = cpu.registers.cir & 0x0F;
				cpu.updateValues();
				dom('.active').removeClass('active');
				dom('#reg_mar').addClass('active');
			break;
			
			case 111: 
				setState(112, "Execute", "The *Control Unit* tells the memory store to look at the address on the *Address Bus* and place that value on the *Data Bus*");
				dom('.active').removeClass('active');
				dom('#ram_value_' + cpu.registers.mar).addClass('active');
				break;
			case 112:
				setState(113, "Execute", "The *Control Unit* copies the value on the *Data Bus* into the *Memory Data Register*");
				cpu.registers.mdr = cpu.ram[cpu.registers.mar];
				cpu.updateValues();
				dom('.active').removeClass('active');
				dom('#reg_mdr').addClass('active');
				break;
			case 113:
				setState(20, "Execute", "The *opcode* and *Control Unit* sends the value in the *Memory Data Register* to the *Accumulator* register.");
				cpu.registers.acc = cpu.registers.mdr;
				cpu.updateValues();
				dom('.active').removeClass('active');
				dom('#reg_mdr,#reg_acc').addClass('active');
			break;
			
			case 12://The *opcode* 0110 means branch (unconditionally)
				setState(20, "Execute", "The *operand* gets stored in the *Program Counter*");
				cpu.registers.pc = cpu.registers.cir & 0x0F;
				cpu.updateValues();
				dom('.active').removeClass('active');
				dom('#reg_pc').addClass('active');
			break;
			
			case 13://The *opcode* 0111 means branch if the *Accumulator* stores a value equal to 0
				setState(20, "Execute", "The *Control Unit* and *opcode* makes the *Arithmetic Logic Unit* check to see if the *Accumulator* register contains a zero. If it does, the *operand* gets copied into the *Program Counter* register");
				if(cpu.registers.acc == 0)
					cpu.registers.pc = cpu.registers.cir & 0x0F;
				cpu.updateValues();
				dom('.active').removeClass('active');
				dom('#reg_acc,#reg_pc,#alu').addClass('active');
			break;
			
			case 14://The *opcode* 1000 means branch if the *Accumulator* stores a value greater than or equal to 0"
				setState(20, "Execute", "The *Control Unit* and *opcode* makes the *Arithmetic Logic Unit* check to see if the *Accumulator* register contains a value greater than zero. If it does, the *operand* gets copied into the *Program Counter* register");
				if(cpu.registers.acc >= 0)
					cpu.registers.pc = cpu.registers.cir & 0x0F;
				dom('.active').removeClass('active');
				cpu.updateValues();
				dom('#alu,#reg_acc,#reg_pc').addClass('active');
			break;
			
			case 15://The *opcode* 1001 means either input or output, depending on the *operand*"
				if((cpu.registers.cir & 0x0F) == 1) {
					setState(20, "Execute", "The *opcode* 0001 and the *Control Bus* reads from the input device and places the input value into the *Accumulator* register");
					cpu.registers.acc = parseInt(prompt("Enter decimal input value:")) & 0xFF;
					cpu.updateValues();
					dom('.active').removeClass('active');
					dom('#reg_acc').addClass('active');
				}
				if((cpu.registers.cir & 0x0F) == 2) {
					setState(20, "Execute", "The *opcode* 0010 and the *Control Bus* causes the value of the *Accumulator* register to be sent to the output device");
					alert("Output: " + cpu.registers.acc);
					dom('.active').removeClass('active');
					dom('#reg_acc').addClass('active');
				}
			break;

			case 20:
				setState(0, "Execute", "The *Control Unit* checks for interrupts and either branches to the relevant interrupt service routine or starts the cycle again.");
				break;
			case 17:
				setState(20, "Execute", "The *Control Unit* increments the *Accumulator* by the value in the *operand*");
				cpu.registers.acc += cpu.registers.cir & 0x0F;
				cpu.updateValues();
				dom('.active').removeClass('active');
				dom('#reg_acc,#alu').addClass('active');
				break;
			case 18:
				setState(20, "Execute", "The *Control Unit* decrements the *Accumulator* by the value in the *operand*");
				cpu.registers.acc -= cpu.registers.cir & 0x0F;
				cpu.updateValues();
				dom('.active').removeClass('active');
				dom('#reg_acc,#alu').addClass('active');
				break;
			case 19:
				setState(20, "Execute", "The *Control Unit* sets the *Accumulator* to the value in the *operand*");
				cpu.registers.acc = cpu.registers.cir & 0x0F;
				cpu.updateValues();
				dom('.active').removeClass('active');
				dom('#reg_acc,#alu').addClass('active');
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

		do {
			cpu.step();
		} while(cpu.state !== 0 && cpu.state !== 7);
	},
	
	state: 0,
	
	running: false,
	
	nextTimeout: 0,
	
	runDelay: 1000,
	
	showHint: function(html) {
		dom('#hint_text').html(html);
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
	
	dec2bin: function(dec) {
		return dec2bin(dec);
	},
	
	hex2dec: function(hex) {
		return hex2dec(hex);
	},
	
	dec2hex: function(dec) {
		return dec2hex(dec);
	},

	compileProgram: function(source, startAddress) {
		return compileProgram(source, startAddress);
	},
	
	updateValues: function() {
		var regNames = Object.keys(cpu.registers);
		
		function writeValue(val, jqDest) {
			if(jqDest.hasClass("value_binary")) {
				val = cpu.dec2bin(val);
			}
			if(jqDest.hasClass("value_hex")) {
				val = cpu.dec2hex(val);
			}
			jqDest.text(val);
		}
		
		cpu.updateRegisterValues();
		for(var i = 0; i < cpu.ram.length; i++) {
			writeValue(cpu.ram[i], dom('#ram_value_' + i));
		}
	},

	updateRegisterValues: function() {
		var regNames = Object.keys(cpu.registers);

		function writeValue(val, jqDest) {
			if(jqDest.hasClass("value_binary")) {
				val = cpu.dec2bin(val);
			}
			if(jqDest.hasClass("value_hex")) {
				val = cpu.dec2hex(val);
			}
			jqDest.text(val);
		}

		for(var i = 0; i < regNames.length; i++) {
			var val = cpu.registers[regNames[i]];
			var jqDest = dom('#reg_' + regNames[i] + "_val");
			writeValue(val, jqDest);
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
		var d = dom('#drawing').html("");
		var w = d.width();
		var h = d.height();
		var paper = Raphael("drawing", w, h);
		paper.clear();

		function connect(from, to, attributes, label, labelAttributes) {

			function getX(i, a) {
				switch(a){
					case 'left':
						return i.position().left;
					break;
					case 'right':
						return i.position().left + i.outerWidth(true);
					break;
					case 'middle':
						return i.position().left + (i.outerWidth(true) / 2);
					break;
					default:
						var percentage = parseInt(a.replace("%", ""));
						return i.position().left + (i.outerWidth(true) * percentage / 100);
					break;
				}
			}
			
			function getY(i, a) {
				switch(a) {
					case 'top':
						return i.position().top;
					break;
					case 'bottom':
						return i.position().top + i.outerHeight(true);
					break;
					case 'middle':
						return i.position().top + (i.outerHeight(true) / 2);
					break;
					default:
						var percentage = parseInt(a.replace("%", ""));
						return i.position().top + (i.outerHeight(true) * percentage / 100);
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
		
		var PC = dom('#reg_pc');
		var MAR = dom('#reg_mar');
		var decodeUnit = dom('.decode_unit');
		var MDR = dom('#reg_mdr');
		var CIR = dom('#reg_cir');
		var ALU = dom('#alu');
		var ACC = dom('#reg_acc');
		var CPU = dom('.cpu');
		var RAM = dom('.ram');
		
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
	
	init: function(jqCPU) {
		dom(window).resize(cpu.updateAnnotations);
		cpu.jqCPU = jqCPU;
		var html ='<div id="drawing"></div><div class="ram"><h3><i class="fa fa-list"></i> RAM</h3>';
		html += '<table class="table table-fixed table-striped table-hover"><thead><tr><th>Address</th><th>Value</th></tr></thead>';
		var params = window.location.search.substr(1);
		var ram = [];
		var initZeros = true;
		if(ram = params.replace("ram=", "")) {
			if(ram = ram.match(/([0-9a-fA-F]{2})/g)) {
				initZeros = false;
			}
		}
		for(var address = 0; address < 16; address++) {
			cpu.ram[address] = initZeros? 0 : cpu.hex2dec(ram[address]);
			html += '<tr><td id="ram_address_' + address + '" class="value value_denary">' + address + '</td><td id="ram_value_' + address + '" class="value value_denary editable" data-description="Memory address ' + address + '">' + cpu.ram[address] + '</td></tr>';
		}
		html += '</table>';
		html += '</div>';
		
		
		html += '<div class="cpu"><h3><i class="fa fa-microchip"></i> CPU</h3>';
		
		function getRegisterHtml(name, value, desc) {
			return '<div class="register" id="reg_' + name.toLowerCase()+'"><div class="reg_name">' + name + '</div><div id="reg_' + name.toLowerCase() + '_val" class="reg_val value value_denary editable" data-description="' + desc + '">' + value + '</div></div>';
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
		html += '</div>';
		
		html += '</div>';
		
		
		
		dom(jqCPU).html(html);
		
		
		cpu.updateAnnotations();
		
		dom('#run_speed').change(function() {
			cpu.runDelay = dom(this).val();
		});
		dom('#btn_examples').click(function() {
			showModal(document.querySelector('#modal_examples'));
		});
		dom('#btn_open_compiler').click(function() {
			showModal(document.querySelector('#modal_compiler'));
			dom('#compiler_source').focus();
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
		
		dom('#btn_reset_cpu').click(function() {
			cpu.state = 0;
			cpu.registers.acc = cpu.registers.cir = cpu.registers.mar = cpu.registers.mdr = cpu.registers.pc = 0;
			cpu.showHint("CPU registers and execution state reset to zero")
			dom('.current_instruction').removeClass('current_instruction');
			cpu.updateRegisterValues();
		});
		
		dom('#btn_share').click(function() {
			dom('#st-2').toggleClass('st-hidden');
		});
		
		setTimeout(function() {
			dom('#st-2').addClass('st-hidden');
		}, 5000);
		
		dom('#btn_reset_ram').click(function() {
			cpu.showHint("All memory store values set to zero");
			for(var address = 0; address < 16; address++) {
				cpu.ram[address] = 0;
				var jq = dom('#ram_value_' + address);
				if(jq.hasClass('value_denary')) {
					jq.text(0);
				}
				if(jq.hasClass('value_binary')) {
					jq.text("00000000");
				}
				if(jq.hasClass('value_hex')) {
					jq.text("00");
				}
			}
		});

		function compileProgramToOutput(loadIntoRam) {
			var status = dom('#compiler_status');
			status.removeClass('text-danger text-success');
			try {
				var startAddress = parseInt(dom('#compiler_address').val(), 10);
				var bytes = cpu.compileProgram(dom('#compiler_source').val(), startAddress);
				var outputFormat = dom('#compiler_format').val();
				var output = [];
				for(var i = 0; i < bytes.length; i++) {
					output.push(outputFormat === 'hex' ? cpu.dec2hex(bytes[i]) : cpu.dec2bin(bytes[i]));
				}
				dom('#compiler_output').val(output.join(outputFormat === 'hex' ? ' ' : '\n'));

				if(loadIntoRam && dom('#compiler_load').is(':checked')) {
					if(startAddress + bytes.length > cpu.ram.length) {
						throw new Error('The program does not fit in RAM from that address.');
					}
					for(var address = 0; address < bytes.length; address++) {
						cpu.ram[startAddress + address] = cpu.hex2dec(cpu.dec2hex(bytes[address]));
					}
					cpu.updateValues();
					status.addClass('text-success').text('Compiled and loaded into RAM.');
				} else {
					status.addClass('text-success').text('Compilation complete.');
				}
			} catch(error) {
				status.addClass('text-danger').text(error.message);
			}
		}

		dom('#btn_compile').click(function() {
			compileProgramToOutput(true);
		});

		dom('#compiler_format').change(function() {
			compileProgramToOutput(false);
		});
		
		dom('.value.editable').click(function(e) {
			var id = e.currentTarget.id;
			
			var jq = dom('#' + id);
			dom('#modal_change_value_title').text(jq.data("description"));
			dom('#change_value_from').text(jq.text());
			dom('#change_value_to').val(jq.text());
			cpu.lastChangedValue = id;
			showModal(document.querySelector('#modal_change_value'));
			dom('#change_value_to').focus().select();
		});
		
		dom('#btn_change_value_ok').click(function() {
			function getInt(jq, val) {
				if(jq.hasClass('value_hex')) {
					return cpu.hex2dec(val);
				}
				if(jq.hasClass('value_binary')) {
					return cpu.bin2dec(val);
				}
				val = parseInt(val, 10) & 0xFF;
				return val >= 128? val - 256: val;
			}
			
			var jq = dom('#' + cpu.lastChangedValue);
			var value = dom('#change_value_to').val();
			var parts = cpu.lastChangedValue.split("_");
			switch(parts[0]) {
				case 'ram':
					var address = parseInt(parts[2]);
					cpu.ram[address] = getInt(jq, value);
				break;
				case 'reg':
					var reg = parts[1];
					cpu.registers[reg] = getInt(jq, value);
				break;
				
			}
			cpu.updateValues();
		});
		
		dom('#btn_step').click(cpu.step);
		dom('#btn_step_instruction').click(cpu.stepInstruction);
		
		dom('#btn_run').click(function() {
			if(cpu.running && cpu.nextTimeout) {
				clearTimeout(cpu.nextTimeout);
			} else {
				cpu.running = true;
				cpu.step();
			}
		});
		
		dom('#btn_toggle_hint').click(function(e) {
			dom('#hint').toggleClass('hint-hidden');
		});
		
		dom('#btn_values_binary, #btn_values_denary, #btn_values_hex').click(function(e) {
			var mode = e.currentTarget.id.split("_")[2];
			dom('.value').each(function(index, element) {
				var jq = dom(this);
				var val = jq.text();
				if(jq.hasClass("value_binary")) {
					val = parseInt(val, 2);
				}
				if(jq.hasClass("value_denary")) {
					val = parseInt(val, 10);
				}
				if(jq.hasClass("value_hex")) {
					val = parseInt(val, 16);
				}
				switch(mode) {
					case 'binary':
						jq.text(cpu.dec2bin(val));
						break
					case 'hex':
						jq.text(cpu.dec2hex(val));
						break;
					case 'denary':
						jq.text(val);
				}
			}).removeClass("value_binary value_denary value_hex").addClass("value_" + mode);
			
		});
		
		dom('#btn_values_binary').trigger("click");
	}
};
window.cpu = cpu;
export { cpu };
dom(function() {
	cpu.init("#cpu")
});