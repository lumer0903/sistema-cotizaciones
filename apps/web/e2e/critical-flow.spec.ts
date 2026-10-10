import { test, expect } from '@playwright/test';

test.describe('Flujo crítico: login → cotización → PDF → logout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('login exitoso como admin', async ({ page }) => {
    await page.fill('input[name="email"]', 'admin@goldcontinent.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible({ timeout: 10000 });
  });

  test('crear cotización y generar PDF', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@goldcontinent.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    await page.goto('/cotizaciones/crear');
    await expect(page.locator('h1')).toBeVisible({ timeout: 15000 });

    await page.locator('input[placeholder*="Escribe el código"], input[placeholder*="código"]').first().waitFor({ state: 'visible', timeout: 30000 });
    
    await page.locator('input[placeholder*="Escribe el código"], input[placeholder*="código"]').first().fill('RYG18-NU02');
    await page.waitForTimeout(3000);
    await expect(page.locator('[role="option"]').first()).toBeVisible({ timeout: 60000 });
    await page.locator('[role="option"]').first().click();
    
    await page.waitForSelector('[role="dialog"]', { timeout: 15000 });
    await page.getByRole('button', { name: 'Agregar' }).click();
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 15000 });

    await expect(page.locator('table tbody tr')).toHaveCount(1, { timeout: 10000 });

    await page.click('button:has-text("Continuar")');
    await expect(page.locator('text=Resumen')).toBeVisible({ timeout: 15000 });
    
    await page.click('button:has-text("Guardar borrador")');
    await expect(page.locator('text=Cotización guardada')).toBeVisible({ timeout: 15000 });

    await page.click('button:has-text("Cambiar estado")');
    await page.selectOption('select[name="estado"]', 'enviada');
    await page.click('button:has-text("Confirmar")');
    await expect(page.locator('text=Estado actualizado')).toBeVisible({ timeout: 15000 });

    await page.click('button:has-text("Exportar PDF")');
    await page.waitForSelector('text=PDF generado', { timeout: 180000 });
    
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Descargar PDF")');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/COT-\d+\.pdf/);
  });

  test('logout exitoso', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@goldcontinent.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

    await page.click('button:has-text("Cerrar sesión")');
    await expect(page).toHaveURL('/login', { timeout: 10000 });
  });
});