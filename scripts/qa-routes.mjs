/**
 * QA visual de rutas (Fase 2): por cada ruta captura status HTTP, URL final,
 * errores de consola, pageerrors y respuestas >=400, y guarda screenshot.
 *
 * Uso:  node scripts/qa-routes.mjs        (requiere web :3000 y api :3001 arriba)
 * Salida: tabla por consola + qa-report.json + qa-screenshots/*.png
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

// puppeteer es dependencia de @goldcontinent/api (pnpm estricto: no está en la raíz)
const requireFromApi = createRequire(path.resolve('apps/api/package.json'));
const puppeteer = requireFromApi('puppeteer');

const WEB = process.env.QA_WEB_URL || 'http://localhost:3000';
const API = process.env.QA_API_URL || 'http://localhost:3001';
const OUT_DIR = path.resolve('qa-screenshots');
const REPORT = path.resolve('qa-report.json');

const ADMIN = { email: 'admin@goldcontinent.com', password: 'admin123' };
const VENDEDOR = { email: 'vendedor.qa@goldcontinent.com', password: 'vendedor123' };

async function apiFetch(url, opts = {}, token = null) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers.Cookie = `accessToken=${token}`;
  const res = await fetch(url, { ...opts, headers });
  let body = null;
  try { body = await res.json(); } catch { /* sin body */ }
  return { status: res.status, body };
}

async function login(cred) {
  const { status, body } = await apiFetch(`${API}/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify(cred),
  });
  if (status >= 300 || !body?.data?.access_token) {
    throw new Error(`Login falló para ${cred.email}: ${status} ${JSON.stringify(body).slice(0, 200)}`);
  }
  return body.data.access_token;
}

async function preflight() {
  for (const [name, url] of [['web', `${WEB}/login`], ['api', `${API}/api/health`]]) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (!res.ok && res.status >= 500) throw new Error(`status ${res.status}`);
    } catch (e) {
      console.error(`[preflight] ${name} no responde en ${url}: ${e.message}`);
      console.error('Levanta el stack primero:  docker compose up -d');
      process.exit(2);
    }
  }
}

/** Crea (o reutiliza) datos mínimos: borrador para editar + usuario vendedor. */
async function setupDatos(adminToken) {
  let borradorId = null;  const existe = await apiFetch(`${API}/api/cotizaciones?limit=1&estado=borrador`, {}, adminToken);
  borradorId = existe.body?.data?.[0]?.id_cotizacion ?? existe.body?.data?.[0]?.id ?? null;
  if (!borradorId) {
    const cli = await apiFetch(`${API}/api/clientes`, {
      method: 'POST',
      body: JSON.stringify({ nombre: 'Cliente QA', telefono: '900000001', tipo: 'normal' }),
    }, adminToken);
    const idCliente = cli.body?.data?.id_cliente;
    const cot = await apiFetch(`${API}/api/cotizaciones`, {
      method: 'POST',
      body: JSON.stringify({
        id_cliente: idCliente,
        tipo_precio: 'normal',
        observaciones: 'QA visual',
        fecha_vencimiento: '2026-10-31',
        detalle: [{ id_producto: 1, tipo_venta: 'mayor', cantidad: 1, precio_unitario: 10 }],
      }),
    }, adminToken);
    borradorId = cot.body?.data?.id_cotizacion ?? cot.body?.id_cotizacion ?? null;
  }

  await apiFetch(`${API}/api/usuarios`, {
    method: 'POST',
    body: JSON.stringify({
      nombre: 'Vendedor QA',
      email: VENDEDOR.email,
      password: VENDEDOR.password,
      rol: 'vendedor',
    }),
  }, adminToken).catch(() => null);

  const cob = await apiFetch(`${API}/api/cobranza?limit=1`, {}, adminToken);
  const cobranzaId = cob.body?.data?.[0]?.id_cotizacion ?? null;

  return { borradorId, cobranzaId };
}

function construirRutas(borradorId, cobranzaId) {
  return [
    // públicas / raíz
    { ruta: '/', rol: 'admin' },
    { ruta: '/login', rol: 'anon' },
    // admin
    { ruta: '/admin', rol: 'admin' },
    { ruta: '/admin/dashboard', rol: 'admin' },
    { ruta: '/admin/productos', rol: 'admin' },
    { ruta: '/admin/productos/crear', rol: 'admin' },
    { ruta: '/admin/precios', rol: 'admin' },
    { ruta: '/admin/inventario', rol: 'admin' },
    { ruta: '/admin/cotizaciones', rol: 'admin' },
    { ruta: '/admin/cotizaciones/crear', rol: 'admin' },
    { ruta: '/admin/cotizaciones/crear/resumen', rol: 'admin' },
    { ruta: `/admin/cotizaciones/editar/${borradorId}`, rol: 'admin' },
    { ruta: '/admin/cotizaciones/detalle/2', rol: 'admin' },
    { ruta: '/admin/cotizaciones/pdf/2', rol: 'admin' },
    { ruta: '/admin/cobranza', rol: 'admin' },
    ...(cobranzaId ? [{ ruta: `/admin/cobranza/${cobranzaId}`, rol: 'admin' }] : []),
    { ruta: '/admin/usuarios', rol: 'admin' },
    { ruta: '/admin/reportes', rol: 'admin' },
    { ruta: '/admin/configuracion', rol: 'admin' },
    // vendedor
    { ruta: '/vendedor', rol: 'vendedor' },
    { ruta: '/vendedor/catalogo', rol: 'vendedor' },
    { ruta: '/vendedor/cotizaciones', rol: 'vendedor' },
    { ruta: '/vendedor/cotizaciones/crear', rol: 'vendedor' },
    { ruta: '/vendedor/cotizaciones/crear/resumen', rol: 'vendedor' },
    { ruta: `/vendedor/cotizaciones/editar/${borradorId}`, rol: 'vendedor' },
    { ruta: '/vendedor/cotizaciones/pdf/2', rol: 'vendedor' },
    // control: sin sesión debe ir a login
    { ruta: '/admin/dashboard', rol: 'anon', esperaLogin: true },
  ];
}

const slug = (ruta, rol) =>
  `${rol}${ruta.replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || 'root'}`.toLowerCase();

async function paginaConSesion(browser, cred) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${WEB}/login`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.type('#email', cred.email);
  await page.type('#password', cred.password);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => null),
    page.click('button[type="submit"]'),
  ]);
  const jar = await page.cookies(`${WEB}/`);
  if (!jar.some((c) => c.name === 'accessToken')) {
    throw new Error(`Login UI falló para ${cred.email} (sin accessToken en el jar)`);
  }
  return page;
}

async function auditarRuta(page, { ruta, rol, esperaLogin }) {
  const consola = [];
  const pageErrors = [];
  const respuestasMalas = [];

  const onConsole = (m) => {
    if (m.type() === 'error' && !m.text().includes('favicon.ico')) consola.push(m.text());
  };
  const onPageError = (e) => pageErrors.push(String(e.message || e));
  const onResponse = (r) => {
    const s = r.status();
    if (s >= 400 && !r.url().includes('favicon.ico')) respuestasMalas.push(`${s} ${r.url().replace(WEB, '')}`);
  };
  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('response', onResponse);

  const registro = {
    ruta, rol,
    status: null,
    urlFinal: null,
    authRedirect: false,
    timeout: false,
    consoleErrors: consola,
    pageErrors,
    respuestasMalas,
    screenshot: null,
  };

  try {
    const resp = await page.goto(`${WEB}${ruta}`, { waitUntil: 'networkidle2', timeout: 25000 })
      .catch((e) => { registro.timeout = /Timeout/i.test(String(e)); return null; });
    registro.status = resp ? resp.status() : null;
    await new Promise((r) => setTimeout(r, 1800));
    registro.urlFinal = page.url().replace(WEB, '') || '/';
    const enLogin = registro.urlFinal.startsWith('/login');
    registro.authRedirect = enLogin && rol !== 'anon';
    if (esperaLogin && !enLogin) registro.authRedirect = false;
    registro.screenshot = `${slug(ruta, rol)}.png`;
    await page.screenshot({ path: path.join(OUT_DIR, registro.screenshot), fullPage: true });
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    page.off('response', onResponse);
  }
  return registro;
}

async function main() {
  await preflight();
  await fs.mkdir(OUT_DIR, { recursive: true });

  const adminToken = await login(ADMIN);
  let vendedorToken = null;
  try { vendedorToken = await login(VENDEDOR); } catch { /* se creará en setup */ }
  const { borradorId, cobranzaId } = await setupDatos(adminToken);
  if (!vendedorToken) vendedorToken = await login(VENDEDOR);
  if (!borradorId) throw new Error('No se pudo crear/obtener borrador para rutas editar');

  const rutas = construirRutas(borradorId, cobranzaId);
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const resultados = [];
  // Una página por rol: las cookies httpOnly reales del login UI persisten en su
  // jar (page.setCookie de Puppeteer 25 no adjunta la cookie a las requests).
  const paginas = { admin: null, vendedor: null };

  for (const item of rutas) {
    let page;
    if (item.rol === 'admin' || item.rol === 'vendedor') {
      if (!paginas[item.rol]) {
        paginas[item.rol] = await paginaConSesion(browser, item.rol === 'admin' ? ADMIN : VENDEDOR);
      }
      page = paginas[item.rol];
    } else {
      // Contexto aislado: newPage() comparte el jar de cookies con las páginas
      // autenticadas y el control "sin sesión" quedaría logueado.
      const ctx = await browser.createBrowserContext();
      page = await ctx.newPage();
      await page.setViewport({ width: 1440, height: 900 });
    }
    const r = await auditarRuta(page, item);
    resultados.push(r);
    const fallos =
      r.pageErrors.length + r.consoleErrors.length + r.respuestasMalas.length +
      (r.authRedirect ? 1 : 0) + (r.status && r.status >= 500 ? 1 : 0);
    console.log(
      `${fallos ? '✗' : '✓'} ${item.ruta.padEnd(42)} rol=${item.rol.padEnd(8)} ` +
      `status=${r.status ?? 'n/a'} urlFinal=${r.urlFinal}` +
      (r.authRedirect ? ' [AUTH-REDIRECT]' : '') +
      (r.consoleErrors.length ? ` consoleErr=${r.consoleErrors.length}` : '') +
      (r.pageErrors.length ? ` pageErr=${r.pageErrors.length}` : '') +
      (r.respuestasMalas.length ? ` resp>=400=${r.respuestasMalas.length}` : ''),
    );
    if (item.rol === 'anon') await page.browserContext().close();
  }

  await browser.close();
  await fs.writeFile(REPORT, JSON.stringify({ fecha: new Date().toISOString(), resultados }, null, 2));

  const conFallos = resultados.filter(
    (r) => r.pageErrors.length || r.consoleErrors.length || r.respuestasMalas.length ||
           r.authRedirect || (r.status && r.status >= 500) || r.timeout,
  );
  console.log(`\nRutas auditadas: ${resultados.length} · con hallazgos: ${conFallos.length}`);
  console.log(`Reporte: ${REPORT}`);
  console.log(`Screenshots: ${OUT_DIR}`);
  if (conFallos.length) {
    console.log('\nDetalle de hallazgos:');
    for (const r of conFallos) {
      console.log(`\n── ${r.ruta} (${r.rol})`);
      if (r.authRedirect) console.log('   · redirigió a /login (sesión no aceptada)');
      if (r.timeout) console.log('   · timeout de navegación');
      for (const e of r.pageErrors) console.log(`   · pageerror: ${e.slice(0, 200)}`);
      for (const e of r.consoleErrors) console.log(`   · console: ${e.slice(0, 200)}`);
      for (const e of r.respuestasMalas) console.log(`   · respuesta: ${e}`);
    }
  }
  process.exit(conFallos.length ? 1 : 0);
}

main().catch((e) => { console.error('QA fatal:', e); process.exit(2); });
