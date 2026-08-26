import { expect } from '@playwright/test';

/** auth-service/src/main/resources/data.sql seeds exactly this user. */
export const SEED = { email: 'testuser@test.com', password: 'password123' };

/** patient-service/src/main/resources/data.sql seeds this many patients. */
export const SEED_COUNT = 15;

/** The drawer files surname-first, so a seeded name reads "Doe, John" there. */
export const drawer = (page) => page.getByRole('complementary', { name: 'Patient roster' });

/**
 * Signs in as the seeded user and waits for the roster to be on screen.
 * Every test starts from a fresh page, so the in-memory registry is back to
 * its 15 seeds each time — no cleanup needed between tests.
 */
export async function signIn(page) {
  await page.goto('/');
  await page.getByLabel('Email').fill(SEED.email);
  await page.getByLabel('Password').fill(SEED.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(drawer(page)).toBeVisible();
  await expect(drawer(page).getByText(`${SEED_COUNT} filed`)).toBeVisible();
}

/** Opens a patient's record from the drawer. Takes the filed form: "Doe, John". */
export async function openRecord(page, filedName) {
  await drawer(page).getByRole('button', { name: filedName }).click();
}
