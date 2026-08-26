import { test, expect } from '@playwright/test';
import { SEED_COUNT, drawer, openRecord, signIn } from './helpers.js';

test.describe('Session and demo registry', () => {
  test('the session survives a reload', async ({ page }) => {
    await signIn(page);

    await page.reload();

    // App reads sessionStorage on mount, so the gate should not come back.
    await expect(drawer(page)).toBeVisible();
    await expect(page.getByText('Records Console')).toBeHidden();
  });

  // What the sign-in card promises: "nothing is saved, and a refresh brings
  // them all back". The registry is module state in the tab, so a reload
  // reseeds it from data.sql even though the session itself persists.
  test('a reload reseeds the registry, discarding changes', async ({ page }) => {
    await signIn(page);
    await openRecord(page, 'Doe, John');
    await page.getByRole('button', { name: 'Remove from roster' }).click();
    await page.getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(drawer(page).getByRole('listitem')).toHaveCount(SEED_COUNT - 1);

    await page.reload();

    await expect(drawer(page).getByRole('listitem')).toHaveCount(SEED_COUNT);
    await expect(drawer(page).getByRole('button', { name: 'Doe, John' })).toBeVisible();
  });

  test('signing out and back in also reseeds', async ({ page }) => {
    await signIn(page);
    await openRecord(page, 'Doe, John');
    await page.getByRole('button', { name: 'Remove from roster' }).click();
    await page.getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(drawer(page).getByRole('listitem')).toHaveCount(SEED_COUNT - 1);

    await page.getByRole('button', { name: 'Sign out' }).click();
    await signIn(page);

    await expect(drawer(page).getByRole('listitem')).toHaveCount(SEED_COUNT);
  });
});
