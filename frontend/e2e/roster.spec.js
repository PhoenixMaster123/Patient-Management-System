import { test, expect } from '@playwright/test';
import { SEED_COUNT, drawer, signIn } from './helpers.js';

test.describe('Roster drawer', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('files all 15 seeded patients surname-first under letter dividers', async ({ page }) => {
    await expect(drawer(page).getByRole('listitem')).toHaveCount(SEED_COUNT);

    // filingName() turns "Bob Brown" into "Brown, Bob", and the drawer sorts on
    // that — so the first entry is B for Brown, not A for Alice Johnson.
    await expect(drawer(page).getByRole('listitem').first()).toContainText('Brown, Bob');
    await expect(drawer(page).getByRole('listitem').last()).toContainText('Wilson, David');
    await expect(drawer(page).getByRole('heading', { level: 2 }).first()).toHaveText('B');
  });

  test('opens with no record selected', async ({ page }) => {
    await expect(page.getByText('No record open')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pick a name from the drawer.' })).toBeVisible();
  });

  test('searches by name', async ({ page }) => {
    await drawer(page).getByLabel('Search the roster').fill('jane');

    await expect(drawer(page).getByRole('listitem')).toHaveCount(1);
    await expect(drawer(page).getByRole('listitem')).toContainText('Smith, Jane');
    await expect(drawer(page).getByText(`1/${SEED_COUNT}`)).toBeVisible();
  });

  test('searches by email', async ({ page }) => {
    await drawer(page).getByLabel('Search the roster').fill('alice.johnson@example.com');

    await expect(drawer(page).getByRole('listitem')).toHaveCount(1);
    await expect(drawer(page).getByRole('listitem')).toContainText('Johnson, Alice');
  });

  test('searches by address', async ({ page }) => {
    // Six of the fifteen seeded addresses are in Springfield.
    await drawer(page).getByLabel('Search the roster').fill('springfield');

    await expect(drawer(page).getByRole('listitem')).toHaveCount(6);
    await expect(drawer(page).getByText(`6/${SEED_COUNT}`)).toBeVisible();
  });

  test('searches by record id', async ({ page }) => {
    // The tail of John Doe's seeded UUID.
    await drawer(page).getByLabel('Search the roster').fill('174000');

    await expect(drawer(page).getByRole('listitem')).toHaveCount(1);
    await expect(drawer(page).getByRole('listitem')).toContainText('Doe, John');
  });

  test('says so when nothing matches', async ({ page }) => {
    await drawer(page).getByLabel('Search the roster').fill('nobody-by-that-name');

    await expect(drawer(page).getByRole('listitem')).toHaveCount(0);
    await expect(drawer(page).getByText('Nothing filed under')).toBeVisible();
  });

  test('clearing the search brings everyone back', async ({ page }) => {
    const search = drawer(page).getByLabel('Search the roster');

    await search.fill('jane');
    await expect(drawer(page).getByRole('listitem')).toHaveCount(1);

    await search.fill('');
    await expect(drawer(page).getByRole('listitem')).toHaveCount(SEED_COUNT);
    await expect(drawer(page).getByText(`${SEED_COUNT} filed`)).toBeVisible();
  });
});
