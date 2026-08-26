import { test, expect } from '@playwright/test';
import { SEED, SEED_COUNT, drawer } from './helpers.js';

test.describe('Sign-in gate', () => {
  test('shows the gate, and no patient data, before signing in', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Records Console')).toBeVisible();
    await expect(page.getByText('No backend here')).toBeVisible();
    await expect(drawer(page)).toBeHidden();
  });

  // The demo build has no auth-service to ask, so SignIn checks the credentials
  // against the seeded pair itself. Getting them wrong must still not open the
  // registry.
  test('refuses credentials that are not the seeded user', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Email').fill('someone@else.com');
    await page.getByLabel('Password').fill('not-the-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(
      page.getByText(`Demo mode accepts the seeded user only: ${SEED.email} / ${SEED.password}`),
    ).toBeVisible();
    await expect(drawer(page)).toBeHidden();
  });

  test('opens the roster for the seeded user', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Email').fill(SEED.email);
    await page.getByLabel('Password').fill(SEED.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(drawer(page)).toBeVisible();
    await expect(drawer(page).getByText(`${SEED_COUNT} filed`)).toBeVisible();
    await expect(page.getByText('In-memory registry seeded from data.sql')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  });

  test('signing out returns to the gate', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Email').fill(SEED.email);
    await page.getByLabel('Password').fill(SEED.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(drawer(page)).toBeVisible();

    await page.getByRole('button', { name: 'Sign out' }).click();

    await expect(page.getByText('Records Console')).toBeVisible();
    await expect(drawer(page)).toBeHidden();
  });
});
