import { expect, test, type Locator, type Page } from "@playwright/test";

test.use({
  channel: "chrome",
  viewport: { width: 1440, height: 1000 },
});

async function mouseDrag(page: Page, source: Locator, target: Locator) {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  expect(sourceBox).not.toBeNull();
  expect(targetBox).not.toBeNull();

  if (!sourceBox || !targetBox) {
    return;
  }

  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 18 });
  await page.mouse.up();
}

test("group and link dragging stays stable", async ({ page }) => {
  await page.goto("http://127.0.0.1:3017");
  await page.getByTestId("link-drag-handle").first().waitFor();

  const groupHandles = page.getByTestId("group-drag-handle");
  if ((await groupHandles.count()) >= 2) {
    await mouseDrag(page, groupHandles.nth(0), groupHandles.nth(1));
    await page.waitForTimeout(600);
  }

  const linkHandles = page.getByTestId("link-drag-handle");
  if ((await linkHandles.count()) >= 2) {
    await mouseDrag(page, linkHandles.nth(0), linkHandles.nth(1));
    await page.waitForTimeout(600);
  }

  await expect(page.getByTestId("link-drag-handle").first()).toBeVisible();
  const stuckTransforms = await page.locator('[style*="translate3d"], [style*="translate("]').count();
  expect(stuckTransforms).toBe(0);
});
