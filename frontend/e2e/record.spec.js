import { test, expect } from '@playwright/test';
import { drawer, openRecord, signIn } from './helpers.js';

test.describe('Patient record', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('opens a record from the drawer', async ({ page }) => {
    await openRecord(page, 'Doe, John');

    await expect(page.getByRole('heading', { name: 'John Doe' })).toBeVisible();
    await expect(page.getByText('john.doe@example.com')).toBeVisible();
    await expect(page.getByText('123 Main St, Springfield')).toBeVisible();
    // formatDate() renders the ISO date from data.sql as "15 Jun 1985".
    await expect(page.getByText('15 Jun 1985')).toBeVisible();
  });

  test('edits a name and files it back to the roster', async ({ page }) => {
    await openRecord(page, 'Doe, John');
    await page.getByRole('button', { name: 'Edit record' }).click();

    await page.getByLabel('Full name').fill('Jonathan Doe');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText('Changes saved.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Jonathan Doe' })).toBeVisible();
    await expect(drawer(page).getByRole('button', { name: 'Doe, Jonathan' })).toBeVisible();
  });

  test('edits the other fields', async ({ page }) => {
    await openRecord(page, 'Smith, Jane');
    await page.getByRole('button', { name: 'Edit record' }).click();

    await page.getByLabel('Email').fill('jane.smith@clinic.example');
    await page.getByLabel('Address').fill('9 Newgate St, Capital City');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText('jane.smith@clinic.example')).toBeVisible();
    await expect(page.getByText('9 Newgate St, Capital City')).toBeVisible();
  });

  test('cancelling an edit keeps the original', async ({ page }) => {
    await openRecord(page, 'Doe, John');
    await page.getByRole('button', { name: 'Edit record' }).click();

    await page.getByLabel('Full name').fill('Somebody Else');
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByRole('heading', { name: 'John Doe' })).toBeVisible();
    await expect(drawer(page).getByRole('button', { name: 'Doe, John' })).toBeVisible();
  });

  test('switching patients resets the card to its resting state', async ({ page }) => {
    await openRecord(page, 'Doe, John');
    await page.getByRole('button', { name: 'Edit record' }).click();
    await expect(page.getByLabel('Full name')).toBeVisible();

    await openRecord(page, 'Smith, Jane');

    await expect(page.getByRole('heading', { name: 'Jane Smith' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit record' })).toBeVisible();
    await expect(page.getByLabel('Full name')).toBeHidden();
  });
});
