import { expect, test } from "@playwright/test";

const unique = () => `e2e-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;

test.describe("Autenticación", () => {
  test("registro crea organización y aterriza en el dashboard", async ({ page }) => {
    const id = unique();
    await page.goto("/registro");
    await page.fill("#firstName", "E2E");
    await page.fill("#lastName", "Tester");
    await page.fill("#email", `${id}@test.dev`);
    await page.fill("#organizationName", `Org ${id}`);
    await page.fill("#password", "ClaveSegura123");
    await page.click("button[type=submit]");

    await page.waitForURL("**/app");
    await expect(page.getByText("Torneos activos")).toBeVisible();
    await expect(page.getByText(`Org ${id}`)).toBeVisible();
  });

  test("login con credenciales malas muestra error inline", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", "nadie@test.dev");
    await page.fill("#password", "Incorrecta123");
    await page.click("button[type=submit]");
    await expect(
      page.getByRole("alert").filter({ hasText: "Credenciales inválidas" }),
    ).toBeVisible();
  });

  test("ruta privada sin sesión redirige a login con next", async ({ page }) => {
    await page.goto("/app/torneos");
    await page.waitForURL("**/login?next=%2Fapp%2Ftorneos");
    await expect(page.locator("#email")).toBeVisible();
  });

  test("validación de contraseña débil en el cliente", async ({ page }) => {
    await page.goto("/registro");
    await page.fill("#firstName", "E2E");
    await page.fill("#lastName", "Tester");
    await page.fill("#email", `${unique()}@test.dev`);
    await page.fill("#organizationName", "Org Débil");
    await page.fill("#password", "corta");
    await page.click("button[type=submit]");
    await expect(page.getByText("Mínimo 10 caracteres", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/registro/); // no navegó
  });
});
