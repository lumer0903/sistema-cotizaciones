import path from 'node:path';
import { createRequire } from 'node:module';

const requireFromApi = createRequire(path.resolve('apps/api/package.json'));
const puppeteer = requireFromApi('puppeteer');

const WEB = 'http://localhost:3000';
const OUT = 'C:/Users/REYNA/AppData/Local/Temp/opencode';

async function login(page) {
  for (const pass of ['admin123', '4e2611d97c51bdbf86a92b6256acca28464a4ee9bc436e1a']) {
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
    if (jar.some((c) => c.name === 'accessToken')) { console.log(`login ok (${pass.slice(0, 8)}...)`); return; }
  }
  throw new Error('login falló con ambas credenciales');
}

const clickPorTexto = (page, selector, texto) => page.evaluate((sel, txt) => {
  const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().includes(txt));
  if (!el) return false;
  el.click();
  return true;
}, selector, texto);

async function diagnosticar(page, etiqueta) {
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 900));
  const info = await page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"]');
    const kids = [...dlg.children];
    const rects = kids.map((k) => {
      const r = k.getBoundingClientRect();
      return { cls: k.className.slice(0, 90), top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) };
    });
    const d = dlg.getBoundingClientRect();
    const cs = getComputedStyle(dlg);
    const bodyEl = kids.find((k) => k.className.includes('overflow-y-auto'));
    const bcs = bodyEl ? getComputedStyle(bodyEl) : null;
    return {
      dlgCls: dlg.className,
      dlgDisplay: cs.display,
      dlgFlexDir: cs.flexDirection,
      dlgH: Math.round(d.height),
      dlgMaxH: cs.maxHeight,
      dlgTop: Math.round(d.top),
      dlgBottom: Math.round(d.bottom),
      viewportH: window.innerHeight,
      bodyFlex: bcs ? `${bcs.flexGrow}/${bcs.flexShrink}/${bcs.flexBasis}` : 'NO BODY',
      bodyMinH: bcs?.minHeight,
      bodyScroll: bodyEl ? { scrollH: bodyEl.scrollHeight, clientH: bodyEl.clientHeight, scrollTop: bodyEl.scrollTop } : null,
      kids: rects,
      gapBelowFooter: rects.length >= 2 ? rects[rects.length - 1].bottom !== Math.round(d.bottom) : null,
      scrollbars: {
        html: document.documentElement.scrollHeight - document.documentElement.clientHeight,
        body: document.body.scrollHeight - document.body.clientHeight,
      },
      lock: {
        htmlOverflow: getComputedStyle(document.documentElement).overflow,
        bodyOverflow: getComputedStyle(document.body).overflow,
        htmlClass: document.documentElement.classList.contains('modal-open'),
        bodyClass: document.body.classList.contains('modal-open'),
      },
      preview: (() => {
        const thumb = document.querySelector('label[title="Cambiar imagen"]');
        if (!thumb) return null;
        const r = thumb.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height) };
      })(),
    };
  });
  console.log(`\n=== ${etiqueta} ===`);
  console.log(JSON.stringify(info, null, 1));
  await page.screenshot({ path: `${OUT}/${etiqueta}.png`, fullPage: false });
  return info;
}

async function main() {
  const w = Number(process.argv[2] || 1440);
  const h = Number(process.argv[3] || 850);
  const tag = process.argv[4] || '';
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h });
  try {
    await login(page);

    await page.goto(`${WEB}/admin/productos`, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise((r) => setTimeout(r, 1500));
    const abrioCrear = await clickPorTexto(page, 'button', 'Agregar Producto');
    if (!abrioCrear) throw new Error('no se encontró Agregar Producto');
    await diagnosticar(page, `diag-crear${tag}`);

    // Escenario de subida de imagen: adjunta y verifica preview + footer
    const input = await page.$('#producto-imagen-input');
    if (input) {
      await input.uploadFile('C:/Users/REYNA/AppData/Local/Temp/opencode/test-img.png');
      await new Promise((r) => setTimeout(r, 1000));
      await diagnosticar(page, `diag-imagen${tag}`);
      await page.evaluate(() => {
        document.querySelector('label[title="Cambiar imagen"]')?.scrollIntoView({ block: 'center' });
      });
      await new Promise((r) => setTimeout(r, 500));
      const st = await page.evaluate(() => {
        const dlg = document.querySelector('[role="dialog"]');
        const body = [...dlg.children].find((k) => k.className.includes('overflow-y-auto'));
        return { scrollTop: Math.round(body.scrollTop), max: body.scrollHeight - body.clientHeight };
      });
      console.log(`scroll preview: ${JSON.stringify(st)}`);
      await page.screenshot({ path: `${OUT}/diag-imagen-scroll${tag}.png`, fullPage: false });
    } else {
      console.log('input #producto-imagen-input no encontrado');
    }

    await clickPorTexto(page, 'button', 'Cancelar');
    await new Promise((r) => setTimeout(r, 700));

    const btnEditar = await page.$('button[aria-label^="Editar"]');
    if (btnEditar) {
      await btnEditar.click();
      await diagnosticar(page, 'diag-editar');
      await clickPorTexto(page, 'button', 'Cancelar');
    } else {
      console.log('sin producto para editar');
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
