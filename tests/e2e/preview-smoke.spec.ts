import { expect, test, type Page } from "@playwright/test";

function previewUrl(name: "PORTAL_PREVIEW_URL" | "BUILD_PREVIEW_URL") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value.replace(/\/+$/, "");
}

function failOnServerErrors(page: Page) {
  const failures: string[] = [];
  page.on("response", (response: { status(): number; url(): string }) => {
    if (response.status() >= 500)
      failures.push(`${response.status()} ${response.url()}`);
  });
  return failures;
}

test("anonymous Chat preview renders its primary shell", async ({ page }) => {
  const serverErrors = failOnServerErrors(page);
  await page.goto(previewUrl("PORTAL_PREVIEW_URL"), {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByTestId("portal-shell")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page).toHaveTitle(/Aomi/i);
  expect(serverErrors).toEqual([]);
});

test("anonymous Build preview renders a read-only composer", async ({
  page,
}) => {
  const serverErrors = failOnServerErrors(page);
  await page.goto(`${previewUrl("BUILD_PREVIEW_URL")}/build`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByTestId("build-shell")).toBeVisible({
    timeout: 30_000,
  });
  const composer = page.getByTestId("build-intent-composer");
  await expect(composer).toBeVisible();
  await composer.fill("preview smoke — do not submit");
  await expect(composer).toHaveValue("preview smoke — do not submit");
  expect(serverErrors).toEqual([]);
});
