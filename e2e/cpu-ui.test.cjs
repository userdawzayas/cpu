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

    await page.locator("#compiler_source").fill("SET 15\nEND");
    await page.locator("#compiler_format").selectOption("hex");
    await page.locator("#compiler_load").check();
    await page.locator("#btn_compile").click();

    assert.equal(await page.locator("#compiler_output").inputValue(), "cf 00");
    assert.equal(await page.locator("#compiler_status").innerText(), "Compiled and loaded into RAM.");
    assert.equal(await page.locator("#ram_value_0").innerText(), "11001111");

    for (let step = 0; step < 8; step += 1) {
      await page.locator("#btn_step").click();
    }

    assert.equal(await page.locator("#reg_acc_val").innerText(), "00001111");
    assert.equal(await page.evaluate(() => window.cpu.state), 20);

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