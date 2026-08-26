import { test, expect } from '@playwright/test';
import { SEED_COUNT, drawer, openRecord, signIn } from './helpers.js';

test.describe('Removing a record', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await openRecord(page, 'Doe, John');
  });

  test('asks before deleting', async ({ page }) => {
    await page.getByRole('button', { name: 'Remove from roster' }).click();

    await expect(
      page.getByText('Remove John Doe from the roster? This deletes the record.'),
    ).toBeVisible();
    await expect(drawer(page).getByRole('listitem')).toHaveCount(SEED_COUNT);
  });

  test('keeps the record when the confirmation is declined', async ({ page }) => {
    await page.getByRole('button', { name: 'Remove from roster' }).click();
    await page.getByRole('button', { name: 'Keep' }).click();

    await expect(page.getByRole('heading', { name: 'John Doe' })).toBeVisible();
    await expect(drawer(page).getByRole('listitem')).toHaveCount(SEED_COUNT);
  });

  test('deletes the record once confirmed', async ({ page }) => {
    await page.getByRole('button', { name: 'Remove from roster' }).click();
    await page.getByRole('button', { name: 'Remove', exact: true }).click();

    await expect(drawer(page).getByRole('listitem')).toHaveCount(SEED_COUNT - 1);
    await expect(drawer(page).getByRole('button', { name: 'Doe, John' })).toBeHidden();
    // App clears the selection on delete, so the stage falls back to its blank state.
    await expect(page.getByText('No record open')).toBeVisible();
  });
});
