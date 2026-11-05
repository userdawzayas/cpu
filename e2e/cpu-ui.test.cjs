const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const { readFile } = require("node:fs/promises");
const { resolve, sep } = require("node:path");
const { test } = require("node:test");
const { chromium } = require("playwright");

const projectRoot = resolve(__dirname, "..");
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8"
};

function createStaticServer() {
  return createServer(async (request, response) => {
    const requestUrl = new URL(request.url, "http://127.0.0.1");
    const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
    const filePath = resolve(projectRoot, `.${decodeURIComponent(pathname)}`);

    if (filePath !== projectRoot && !filePath.startsWith(`${projectRoot}${sep}`)) {
      response.writeHead(403).end();
      return;
    }

    try {
      const body = await readFile(filePath);
      const extension = filePath.slice(filePath.lastIndexOf("."));
      response.writeHead(200, {
        "content-type": mimeTypes[extension] ?? "application/octet-stream"
      });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
}

test("the UI compiles a program, loads RAM, and steps SET into the accumulator", async () => {
  const server = createStaticServer();
  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address();
  const origin = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    const pageErrors = [];
    const requestedUrls = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("request", (request) => requestedUrls.push(request.url()));
    await page.route("**/*", async (route) => {
      const url = new URL(route.request().url());

      if (url.origin !== origin) {
        await route.abort();
        return;
      }
      await route.continue();
    });

    await page.goto(origin, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.cpu && document.querySelector("#ram_value_0"));
    assert.equal(await page.title(), "OCR A Level CPU simulator");
    assert.equal(await page.locator("#btn_import_export").count(), 0);
    assert.equal(await page.locator("#modal_export").count(), 0);
    assert.equal(await page.locator("#reg_acc_val").innerText(), "00000000");
    assert.equal(await page.locator(".decode_unit th").count(), 4);
    assert.equal(await page.locator(".decode_row_5 td").nth(3).innerText(), "LOAD");
    assert.equal(await page.locator(".decode_row_13 td").nth(1).innerText(), "[address]");
    assert.equal(await page.locator(".decode_row_13 td").nth(3).innerText(), "LOAD");
    assert.equal(await page.locator(".decode_row_14 td").nth(1).innerText(), "[address]");
    assert.equal(await page.locator(".decode_row_14 td").nth(3).innerText(), "STORE");
    assert.equal(await page.locator(".decode_row_9").nth(0).locator("td").nth(3).innerText(), "INPUT");
    assert.equal(await page.locator(".decode_row_9").nth(1).locator("td").nth(3).innerText(), "OUTPUT");
    const busEnds = await page.evaluate(() => {
      const ramLeft = document.querySelector(".ram").offsetLeft;
      return [...document.querySelectorAll("#drawing svg path")]
        .filter((path) => path.getAttribute("stroke") === "#ff0000")
        .map((path) => {
          const coordinates = path.getAttribute("d").match(/-?\d+(?:\.\d+)?/g).map(Number);
          return { endX: coordinates[coordinates.length - 2], ramLeft };
        });
    });
    assert.equal(busEnds.length, 3);
    assert.ok(busEnds.every(({ endX, ramLeft }) => endX <= ramLeft - 10));

    assert.equal(await page.locator("#modal_compiler").evaluate((modal) => modal.classList.contains("in")), false);
    await page.locator("#btn_open_compiler").click();
    assert.equal(await page.locator("#modal_compiler").evaluate((modal) => modal.classList.contains("in")), true);
    assert.equal(await page.evaluate(() => document.activeElement.id), "compiler_source");
    await page.keyboard.press("Escape");
    await page.locator("#compiler_source").evaluate((textarea) => { textarea.scrollTop = textarea.scrollHeight; });
    await page.locator("#btn_open_compiler").click();
    assert.equal(await page.locator("#compiler_source").evaluate((textarea) => textarea.scrollTop), 0);
    const compilerModalSize = await page.locator("#modal_compiler .modal-dialog").evaluate((dialog) => ({
      width: dialog.getBoundingClientRect().width,
      viewportWidth: window.innerWidth,
      sourceFits: document.querySelector("#compiler_source").scrollWidth <= document.querySelector("#compiler_source").clientWidth,
      outputFits: document.querySelector("#compiler_output").scrollWidth <= document.querySelector("#compiler_output").clientWidth
    }));
    assert.ok(compilerModalSize.width > 600);
    assert.ok(compilerModalSize.width <= compilerModalSize.viewportWidth - 32);
    assert.equal(compilerModalSize.sourceFits, true);
    assert.equal(compilerModalSize.outputFits, true);
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileCompilerWidth = await page.locator("#modal_compiler .modal-dialog").evaluate((dialog) => ({
      width: dialog.getBoundingClientRect().width,
      left: dialog.getBoundingClientRect().left,
      right: dialog.getBoundingClientRect().right,
      viewportWidth: window.innerWidth,
      textareasFit: [...dialog.querySelectorAll("textarea")].every((textarea) => {
        const bounds = textarea.getBoundingClientRect();
        return bounds.left >= dialog.getBoundingClientRect().left &&
          bounds.right <= dialog.getBoundingClientRect().right &&
          textarea.scrollWidth <= textarea.clientWidth;
      })
    }));
    assert.ok(mobileCompilerWidth.width <= mobileCompilerWidth.viewportWidth - 32);
    assert.ok(mobileCompilerWidth.left >= 0);
    assert.ok(mobileCompilerWidth.right <= mobileCompilerWidth.viewportWidth);
    assert.equal(mobileCompilerWidth.textareasFit, true);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.locator("#compiler_source").fill("SET 15\nINC 1\nEND");
    await page.locator("#compiler_format").selectOption("hex");
    await page.locator("#compiler_load").check();
    await page.locator("#btn_compile").click();

    assert.equal(await page.locator("#compiler_output").inputValue(), "c0f a01 000");
    assert.equal(await page.locator("#compiler_status").innerText(), "Compiled and loaded into RAM.");
    assert.equal(await page.locator("#ram_value_0").innerText(), "110000001111");
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#modal_compiler").evaluate((modal) => modal.classList.contains("in")), false);

    await page.locator("#btn_step_instruction").click();

    assert.equal(await page.locator("#reg_acc_val").innerText(), "00001111");
    assert.equal(await page.evaluate(() => window.cpu.state), 0);
    await page.locator("#btn_step_instruction").click();
    assert.equal(await page.locator("#reg_acc_val").innerText(), "00010000");
    assert.equal(await page.evaluate(() => window.cpu.state), 0);
    await page.locator("#btn_step_instruction").click();
    assert.equal(await page.evaluate(() => window.cpu.state), 7);

    const ramBeforeCpuReset = await page.evaluate(() => [...window.cpu.ram]);
    const ramDisplayBeforeCpuReset = await page.locator("#ram_value_0").innerText();
    await page.locator("#btn_reset_cpu").click();
    assert.deepEqual(await page.evaluate(() => [...window.cpu.ram]), ramBeforeCpuReset);
    assert.equal(await page.locator("#ram_value_0").innerText(), ramDisplayBeforeCpuReset);
    for (const register of ["acc", "pc", "mar"]) {
      assert.equal(await page.locator(`#reg_${register}_val`).innerText(), "00000000");
    }
    for (const register of ["mdr", "cir"]) {
      assert.equal(await page.locator(`#reg_${register}_val`).innerText(), "000000000000");
    }
    for (let step = 0; step < 8; step += 1) {
      await page.locator("#btn_step").click();
    }
    assert.equal(await page.evaluate(() => window.cpu.state), 20);
    await page.locator("#btn_step_instruction").click();
    assert.equal(await page.locator("#reg_acc_val").innerText(), "00010000");
    assert.equal(await page.evaluate(() => window.cpu.state), 0);

    await page.locator("#btn_examples").click();
    assert.equal(await page.locator("#modal_examples").evaluate((modal) => modal.classList.contains("in")), true);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#modal_examples").evaluate((modal) => modal.classList.contains("in")), false);

    await page.locator("#reg_acc_val").click();
    assert.equal(await page.locator("#modal_change_value").evaluate((modal) => modal.classList.contains("in")), true);
    await page.locator("#change_value_to").fill("00101010");
    await page.locator("#btn_change_value_ok").click();
    assert.equal(await page.locator("#reg_acc_val").innerText(), "00101010");
    assert.equal(await page.locator("#modal_change_value").evaluate((modal) => modal.classList.contains("in")), false);

    await page.locator("#btn_values_hex").click();
    assert.equal(await page.locator("#reg_acc_val").innerText(), "2a");
    assert.equal(await page.locator("#ram_value_0").innerText(), "c0f");

    await page.locator("#btn_open_compiler").click();
    await page.locator("#compiler_source").fill("UNKNOWN");
    await page.locator("#btn_compile").click();
    assert.equal(await page.locator("#compiler_status").innerText(), "Line 1: unknown instruction UNKNOWN.");
    assert.equal(await page.locator("#compiler_status").getAttribute("class"), "text-danger");

    await page.locator("#compiler_source").fill("BRANCH ;finish\nSET 15\n;finish SET 7\nEND");
    await page.locator("#btn_compile").click();
    assert.equal(await page.locator("#compiler_output").inputValue(), "602 c0f c07 000");
    assert.equal(await page.locator("#compiler_status").innerText(), "Compiled and loaded into RAM.");
    assert.equal(requestedUrls.some((url) => /code\.jquery\.com|bootstrap\.min\.js/.test(url)), false);
    assert.deepEqual(pageErrors, []);

    const inputs = ["3", "5"];
    const outputs = [];
    page.on("dialog", async (dialog) => {
      if (dialog.type() === "prompt") {
        await dialog.accept(inputs.shift());
      } else {
        outputs.push(dialog.message().replace("Output: ", ""));
        await dialog.dismiss();
      }
    });
    await page.locator("#compiler_source").fill(
      "INPUT\nSTORE 1111\nINPUT\nSTORE 1110\nSUB 1111\n" +
      "BRANCHPOS ;mostrar_segundo\nLOAD 1111\nOUTPUT\nEND\n" +
      ";mostrar_segundo LOAD 1110\nOUTPUT\nEND"
    );
    await page.locator("#btn_compile").click();
    await page.keyboard.press("Escape");
    await page.locator("#btn_step_instruction").click();
    assert.equal(await page.evaluate(() => window.cpu.state), 0);
    assert.equal(await page.locator("#reg_pc_val").innerText(), "01");
    assert.equal(await page.locator("#reg_acc_val").innerText(), "03");
    await page.locator("#btn_step_instruction").click();
    assert.equal(await page.locator("#ram_value_15").innerText(), "003");
    await page.locator("#btn_step_instruction").click();
    assert.equal(await page.evaluate(() => window.cpu.state), 0);
    assert.equal(await page.locator("#reg_pc_val").innerText(), "03");
    assert.equal(await page.locator("#reg_acc_val").innerText(), "05");
    for (let instruction = 3; instruction < 6; instruction += 1) {
      await page.locator("#btn_step_instruction").click();
    }
    for (let instruction = 6; instruction < 9; instruction += 1) {
      await page.locator("#btn_step_instruction").click();
    }
    assert.deepEqual(outputs, ["5"]);
    assert.equal(await page.evaluate(() => window.cpu.state), 7);

    await page.locator("#btn_examples").click();
    await page.locator("#modal_examples a").nth(1).click();
    await page.waitForFunction(() => window.cpu?.ram?.[0] === 0x901);
    assert.equal(new URL(page.url()).pathname, "/");
    assert.equal(new URL(page.url()).searchParams.get("program"), "add");
    assert.deepEqual(
      await page.evaluate(() => window.cpu.ram.slice(0, 6)),
      [0x901, 0x30f, 0x901, 0x10f, 0x902, 0]
    );
    await page.locator("#btn_values_denary").click();
    assert.match(await page.locator("#compiler_source").inputValue(), /STORE 0d15 # Guardo el primer sumando/);
    assert.deepEqual(
      await page.evaluate(() => window.cpu.compileProgram(document.querySelector("#compiler_source").value)),
      [0x901, 0x30f, 0x901, 0x10f, 0x902, 0]
    );
    await page.locator("#btn_values_hex").click();
    assert.match(await page.locator("#compiler_source").inputValue(), /ADD 0xF # Sumo el valor guardado/);
    assert.deepEqual(
      await page.evaluate(() => window.cpu.compileProgram(document.querySelector("#compiler_source").value)),
      [0x901, 0x30f, 0x901, 0x10f, 0x902, 0]
    );
    await page.locator("#btn_values_binary").click();
    assert.match(await page.locator("#compiler_source").inputValue(), /STORE 1111 # Guardo el primer sumando/);
    await page.locator("#btn_open_compiler").click();
    assert.match(await page.locator("#compiler_source").inputValue(), /INPUT # Pido el primer sumando[\s\S]*END # Termino el programa/);
    await page.keyboard.press("Escape");

    await page.locator("#btn_examples").click();
    await page.locator("#modal_examples a").nth(2).click();
    await page.waitForFunction(() => window.cpu?.ram?.[0] === 0x901);
    assert.equal(new URL(page.url()).searchParams.get("program"), "largest");
    assert.deepEqual(
      await page.evaluate(() => window.cpu.ram.slice(0, 12)),
      [0x901, 0x30f, 0x901, 0x30e, 0x20f, 0x809, 0x50f, 0x902, 0, 0x50e, 0x902, 0]
    );

    await page.locator("#btn_examples").click();
    await page.locator("#modal_examples a").nth(3).click();
    await page.waitForFunction(() => window.cpu?.ram?.[0] === 0x901);
    assert.equal(new URL(page.url()).searchParams.get("program"), "multiply");
    await page.locator("#btn_open_compiler").click();
    assert.match(await page.locator("#compiler_source").inputValue(), /STORE multiplicando[\s\S]*STORE multiplicador[\s\S]*STORE resultado[\s\S]*BRANCHZERO ;mostrar_resultado/);
    await page.locator("#btn_compile").click();
    assert.equal(await page.locator("#compiler_status").innerText(), "Compilation complete.");

    await page.locator("#compiler_source").fill(
      "SET 42\nSTORE 22\nSET 22\nSTORE 20\nLOAD [20]\nSET 73\nSTORE [20]\nEND"
    );
    await page.locator("#compiler_format").selectOption("hex");
    await page.locator("#compiler_load").check();
    await page.locator("#btn_compile").click();
    assert.equal(await page.locator("#compiler_output").inputValue(), "c2a 316 c16 314 d14 c49 e14 000");
    await page.keyboard.press("Escape");
    for (let instruction = 0; instruction < 4; instruction += 1) {
      await page.locator("#btn_step_instruction").click();
    }
    for (let step = 0; step < 7; step += 1) {
      await page.locator("#btn_step").click();
    }
    assert.equal(await page.evaluate(() => window.cpu.state), 131);
    await page.locator("#btn_step").click();
    assert.deepEqual(await page.evaluate(() => ({ state: window.cpu.state, mar: window.cpu.registers.mar })), { state: 132, mar: 20 });
    await page.locator("#btn_step").click();
    assert.deepEqual(await page.evaluate(() => ({ state: window.cpu.state, mar: window.cpu.registers.mar, mdr: window.cpu.registers.mdr })), { state: 133, mar: 20, mdr: 22 });
    await page.locator("#btn_step").click();
    assert.deepEqual(await page.evaluate(() => ({ state: window.cpu.state, mar: window.cpu.registers.mar })), { state: 134, mar: 22 });
    await page.locator("#btn_step").click();
    assert.deepEqual(await page.evaluate(() => ({ state: window.cpu.state, mdr: window.cpu.registers.mdr })), { state: 135, mdr: 42 });
    await page.locator("#btn_step").click();
    assert.equal(await page.evaluate(() => window.cpu.registers.acc), 42);
    await page.locator("#btn_step_instruction").click();
    await page.locator("#btn_step_instruction").click();
    await page.locator("#btn_step_instruction").click();
    assert.equal(await page.evaluate(() => window.cpu.ram[22]), 73);
    await page.locator("#btn_values_binary").click();
    await page.locator("#btn_reset_ram").click();
    assert.equal(await page.evaluate(() => window.cpu.ram.every((value) => value === 0)), true);
    assert.equal(await page.locator("#ram_value_0").innerText(), "000000000000");

    await page.locator("#btn_examples").click();
    await page.locator("#modal_examples a").nth(4).click();
    await page.waitForFunction(() => window.cpu?.ram?.[0] === 0x901);
    assert.equal(new URL(page.url()).searchParams.get("program"), "multiplyTable");
    assert.match(await page.locator("#compiler_source").inputValue(), /STORE \[11110010\]/);
    const tableExecution = await page.evaluate(() => {
      window.prompt = () => "7";
      let instructions = 0;
      while (window.cpu.state !== 7 && instructions < 300) {
        window.cpu.stepInstruction();
        instructions += 1;
      }
      return {
        halted: window.cpu.state === 7,
        products: window.cpu.ram.slice(246, 256)
      };
    });
    assert.equal(tableExecution.halted, true);
    assert.deepEqual(tableExecution.products, [7, 14, 21, 28, 35, 42, 49, 56, 63, 70]);

    await page.locator("#btn_examples").click();
    await page.locator("#modal_examples a").nth(5).click();
    await page.waitForFunction(() => window.cpu?.ram?.[0] === 0xc05);
    assert.equal(new URL(page.url()).searchParams.get("program"), "reverseNumbers");
    const reverseSource = await page.locator("#compiler_source").inputValue();
    assert.match(reverseSource, /^# Pide 5 números y los muestra en orden inverso\.\n\n# Algoritmo:[\s\S]*\n\n# Implementación\n/);
    assert.match(reverseSource, /SET 101 # Pongo cinco en el acumulador como total de números[\s\S]*STORE 11111111 # Guardo el total de números[\s\S]*STORE 11111110 # Inicializo cuántos números faltan por pedir/);
    assert.match(reverseSource, /STORE \[11111101\] # Guardo el número en la dirección apuntada/);
    assert.match(reverseSource, /LOAD \[11111101\] # Cargo el número apuntado/);
    await page.locator("#btn_open_compiler").click();
    assert.equal(await page.locator("#compiler_source").evaluate((textarea) => textarea.scrollTop), 0);
    assert.equal(await page.locator("#compiler_source").evaluate((textarea) => textarea.selectionStart), 0);
    assert.deepEqual(pageErrors, []);
  } finally {
    await browser.close();
    await new Promise((resolveClose, rejectClose) => {
      server.close((error) => error ? rejectClose(error) : resolveClose());
    });
  }
}, { timeout: 30000 });