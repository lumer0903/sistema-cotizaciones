/**
 * Smoke UI del ProductoModal: crea (verifica descripción autogenerada + follaje)
 * y edita (verifica que NO se regenera al abrir y que SÍ regenera al cambiar
 * atributos). No guarda: la persistencia ya se validó vía API.
 *
 * Uso: node scripts/smoke-ui-producto.mjs   (requiere web :3000 y api :3001)
 */
import path from 'node:path';
import { createRequire } from 'node:module';

const requireFromApi = createRequire(path.resolve('apps/api/package.json'));
const puppeteer = requireFromApi('puppeteer');

const WEB = 'http://localhost:3000';
const API = 'http://localhost:3001';
const PASS_LARGA = '4e2611d97c51bdbf86a92b6256acca28464a4ee9bc436e1a';

let fallos = 0;
const ok = (m) => console.log(`  PASS  ${m}`);
const bad = (m) => { fallos++; console.log(`  FAIL  ${m}`); };

async function loginUi(page) {
  for (const pass of ['admin123', PASS_LARGA]) {
    await page.goto(`${WEB}/login`, { waitUntil: 'networkidle2', timeout: 45000 });
    await page.$eval('#email', (el) => (el.value = ''));
    await page.$eval('#password', (el) => (el.value = ''));
    await page.type('#email', 'admin@goldcontinent.com');
    await page.type('#password', pass);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => null),
      page.click('button[type="submit"]'),
    ]);
    const jar = await page.cookies(`${WEB}/`);
    if (jar.some((c) => c.name === 'accessToken')) { ok(`login UI (${pass === 'admin123' ? 'admin123' : 'pass larga'})`); return; }
  }
  throw new Error('login UI falló con ambas credenciales');
}

async function setInputPorLabel(page, label, value) {
  const encontrado = await page.evaluate((lbl) => {
    const labels = [...document.querySelectorAll('label')];
    const l = labels.find((x) => x.textContent.trim() === lbl);
    if (!l) return false;
    const input = l.parentElement?.querySelector('input');
    if (!input) return false;
    input.focus();
    return true;
  }, label);
  if (!encontrado) throw new Error(`input no encontrado: ${label}`);
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.type(value, { delay: 10 });
}

const leerTextarea = (page) => page.evaluate(() => document.querySelector('textarea')?.value ?? null);

const clickPorTexto = (page, selector, texto) => page.evaluate((sel, txt) => {
  const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().includes(txt));
  if (!el) return false;
  el.click();
  return true;
}, selector, texto);

async function main() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e.message || e)));

  try {
    await loginUi(page);
    await page.goto(`${WEB}/admin/inventario`, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise((r) => setTimeout(r, 1500));

    console.log('\nESCENARIO A — crear: descripción autogenerada + follaje');
    const abrio = await clickPorTexto(page, 'button', 'Agregar Producto');
    if (!abrio) throw new Error('no se encontró botón Agregar Producto');
    await page.waitForSelector('textarea', { timeout: 10000 });
    await setInputPorLabel(page, 'CÓDIGO', 'SMOKE-UI-01');
    await setInputPorLabel(page, 'TIPO DE FLOR', 'Rosa');
    await setInputPorLabel(page, 'MATERIAL', 'Tela Satin');
    await setInputPorLabel(page, 'COMPOSICIÓN', 'Plastico');
    await setInputPorLabel(page, 'PRESENTACIÓN', 'Vara X 10 Flores');
    await setInputPorLabel(page, 'FOLLAJE', 'Verde');
    await setInputPorLabel(page, 'Nº CABEZAS', '10');
    await setInputPorLabel(page, 'TAMAÑO', '45 CM');
    await setInputPorLabel(page, 'UNIDADES POR CAJA', '12');
    await new Promise((r) => setTimeout(r, 500));
    const esperada =
      'SMOKE-UI-01 ROSA MATERIAL TELA SATIN COMPOSICION PLASTICO PRESENTACION VARA X 10 FLORES FOLLAJE VERDE 10 CABEZAS 45 CM (CAJA X 12 UNID)';
    const generada = await leerTextarea(page);
    generada === esperada
      ? ok(`descripción autogenerada: "${generada}"`)
      : bad(`descripción esperada [${esperada}] y vino [${generada}]`);
    const follaje = await page.evaluate(() => {
      const l = [...document.querySelectorAll('label')].find((x) => x.textContent.trim() === 'FOLLAJE');
      return l?.parentElement?.querySelector('input')?.value ?? null;
    });
    follaje === 'Verde' ? ok('campo FOLLAJE con valor') : bad(`FOLLAJE=[${follaje}]`);
    await page.screenshot({ path: 'qa-screenshots/smoke-ui-crear.png', fullPage: false });
    const cerro = await clickPorTexto(page, 'button', 'Cancelar');
    if (!cerro) throw new Error('no se encontró Cancelar');
    await new Promise((r) => setTimeout(r, 700));

    console.log('\nESCENARIO B — editar: no pisa la descripción; regenera al cambiar atributos');
    const search = await page.evaluate(() => {
      const input = document.querySelector('input[placeholder*="Buscar"], input[type="search"]');
      if (input) { input.focus(); return true; }
      return false;
    });
    if (!search) throw new Error('buscador no encontrado');
    await page.keyboard.type('SMOKE-TFIDF-01', { delay: 20 });
    await new Promise((r) => setTimeout(r, 1500));
    const btnEditar = `button[aria-label="Editar SMOKE-TFIDF-01"]`;
    await page.waitForSelector(btnEditar, { timeout: 15000 });
    await page.click(btnEditar);
    await page.waitForSelector('textarea', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 800));
    const esperadaEdicion =
      'SMOKE-TFIDF-01 ROSA MATERIAL TELA ORGANZA COMPOSICION PLASTICO PRESENTACION VARA X 9 FLORES FOLLAJE VERDE OSCURO 9 CABEZAS 40 CM (CAJA X 12 UNID)';
    const alAbrir = await leerTextarea(page);
    alAbrir === esperadaEdicion
      ? ok('al abrir NO regenera la descripción intacta')
      : bad(`al abrir debía mantener [${esperadaEdicion}] y vino [${alAbrir}]`);
    const follajeEdit = await page.evaluate(() => {
      const l = [...document.querySelectorAll('label')].find((x) => x.textContent.trim() === 'FOLLAJE');
      return l?.parentElement?.querySelector('input')?.value ?? null;
    });
    follajeEdit === 'Verde Oscuro' ? ok('FOLLAJE cargado desde BD') : bad(`FOLLAJE edición=[${follajeEdit}]`);
    await setInputPorLabel(page, 'MATERIAL', 'Tela Seda');
    await new Promise((r) => setTimeout(r, 500));
    const trasCambio = await leerTextarea(page);
    trasCambio === esperadaEdicion.replace('TELA ORGANZA', 'TELA SEDA')
      ? ok('al cambiar MATERIAL regenera con el nuevo valor')
      : bad(`tras cambio se esperaba regeneración, vino [${trasCambio}]`);
    await page.screenshot({ path: 'qa-screenshots/smoke-ui-editar.png', fullPage: false });
    await clickPorTexto(page, 'button', 'Cancelar');
    await new Promise((r) => setTimeout(r, 500));

    pageErrors.length === 0
      ? ok('sin pageerrors en la sesión')
      : bad(`pageerrors: ${pageErrors.slice(0, 3).join(' | ').slice(0, 300)}`);
  } finally {
    await browser.close();
  }

  console.log(`\nResultado: ${fallos === 0 ? 'TODO OK' : fallos + ' fallo(s)'}`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error('SMOKE FATAL:', e.message); process.exit(2); });
