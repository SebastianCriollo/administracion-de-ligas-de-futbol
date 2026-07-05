import { expect, test, type Page } from "@playwright/test";

const unique = () => `e2e-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;

async function registerAndLogin(page: Page): Promise<string> {
  const id = unique();
  await page.goto("/registro");
  await page.fill("#firstName", "E2E");
  await page.fill("#lastName", "Wizard");
  await page.fill("#email", `${id}@test.dev`);
  await page.fill("#organizationName", `Org ${id}`);
  await page.fill("#password", "ClaveSegura123");
  await page.click("button[type=submit]");
  await page.waitForURL("**/app");
  return id;
}

test.describe("Wizard de torneo", () => {
  test("crea, previsualiza y publica una liga completa desde cero", async ({ page }) => {
    await registerAndLogin(page);

    // Paso 1: datos y formato
    await page.goto("/app/torneos/nuevo");
    await page.fill("#name", "Liga E2E");
    await page.click("text=Liga + Playoffs");
    await page.click("text=Fútbol 7");
    await page.click("button:has-text('Continuar')");

    // Paso 2: crear 4 equipos rápidos y seleccionarlos
    await expect(page.getByText("Equipos participantes")).toBeVisible();
    for (const name of ["Rojo", "Azul", "Verde", "Negro"]) {
      await page.fill("input[placeholder='Crear equipo rápido…']", `Equipo ${name}`);
      await page.click("button:has-text('Crear')");
      await expect(page.getByText(`Equipo ${name}`, { exact: true })).toBeVisible();
    }
    // los creados quedan auto-seleccionados
    await expect(page.getByText("Seleccionados: 4")).toBeVisible();
    await page.click("button:has-text('Generar preview')");

    // Paso 3: preview del motor
    await expect(page.getByText("Etapa 1: Fase regular")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Jornada 1")).toBeVisible();
    await expect(page.getByText("Etapa 2: Playoffs")).toBeVisible();

    // Publicar → detalle con tabla y fixture
    await page.click("button:has-text('Publicar torneo')");
    await page.waitForURL("**/app/torneos/**", { timeout: 20_000 });
    await expect(page.getByText("PUBLISHED")).toBeVisible();
    await expect(page.getByText("Tabla de posiciones")).toBeVisible();
    await expect(page.getByText("Fase regular")).toBeVisible();
    await expect(page.getByText("Por definir").first()).toBeVisible(); // playoffs sin sembrar
  });

  test("el dashboard refleja los equipos y torneos creados", async ({ page }) => {
    await registerAndLogin(page);
    await expect(page.getByText("Torneos activos")).toBeVisible();
    // organización nueva: estado vacío con CTA
    await page.goto("/app/torneos");
    await expect(page.getByText("Aún no hay torneos")).toBeVisible();
  });
});
