import { test, expect } from "@playwright/test";

test("la app sigue funcionando sin conexión", async ({ page, context }) => {
  await page.goto("/login");
  await page.fill('input[type="email"]', "matias@ejemplo.com");
  await page.fill('input[type="password"]', "matias2020");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("http://localhost:5173/");

  await context.setOffline(true);

  await page.click("text=+ Nuevo campo");
  await page.fill('input[required]', "Campo de prueba E2E");
  await page.click("text=Guardar campo");

  await expect(page.locator("text=Campo de prueba E2E")).toBeVisible();
});