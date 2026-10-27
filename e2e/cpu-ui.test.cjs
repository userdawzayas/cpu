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
    await page.locator("#compiler_source").fill("SET 15\nEND");
    await page.locator("#compiler_format").selectOption("hex");
    await page.locator("#compiler_load").check();
    await page.locator("#btn_compile").click();

    assert.equal(await page.locator("#compiler_output").inputValue(), "cf 00");
    assert.equal(await page.locator("#compiler_status").innerText(), "Compiled and loaded into RAM.");
    assert.equal(await page.locator("#ram_value_0").innerText(), "11001111");
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#modal_compiler").evaluate((modal) => modal.classList.contains("in")), false);

    for (let step = 0; step < 8; step += 1) {
      await page.locator("#btn_step").click();
    }

    assert.equal(await page.locator("#reg_acc_val").innerText(), "00001111");
    assert.equal(await page.evaluate(() => window.cpu.state), 20);

    const ramBeforeCpuReset = await page.evaluate(() => [...window.cpu.ram]);
    const ramDisplayBeforeCpuReset = await page.locator("#ram_value_0").innerText();
    await page.locator("#btn_reset_cpu").click();
    assert.deepEqual(await page.evaluate(() => [...window.cpu.ram]), ramBeforeCpuReset);
    assert.equal(await page.locator("#ram_value_0").innerText(), ramDisplayBeforeCpuReset);
    for (const register of ["acc", "pc", "mar", "mdr", "cir"]) {
      assert.equal(await page.locator(`#reg_${register}_val`).innerText(), "00000000");
    }

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
    assert.equal(await page.locator("#ram_value_0").innerText(), "cf");

    await page.locator("#btn_open_compiler").click();
    await page.locator("#compiler_source").fill("UNKNOWN");
    await page.locator("#btn_compile").click();
    assert.equal(await page.locator("#compiler_status").innerText(), "Line 1: unknown instruction UNKNOWN.");
    assert.equal(await page.locator("#compiler_status").getAttribute("class"), "text-danger");

    await page.locator("#compiler_source").fill("BRANCH ;finish\nSET 15\n;finish SET 7\nEND");
    await page.locator("#btn_compile").click();
    assert.equal(await page.locator("#compiler_output").inputValue(), "62 cf c7 00");
    assert.equal(await page.locator("#compiler_status").innerText(), "Compiled and loaded into RAM.");
    assert.equal(requestedUrls.some((url) => /code\.jquery\.com|bootstrap\.min\.js/.test(url)), false);
    assert.deepEqual(pageErrors, []);
  } finally {
    await browser.close();
    await new Promise((resolveClose, rejectClose) => {
      server.close((error) => error ? rejectClose(error) : resolveClose());
    });
  }
}, { timeout: 30000 });