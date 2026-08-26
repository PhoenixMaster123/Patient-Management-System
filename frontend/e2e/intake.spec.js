import { test, expect } from '@playwright/test';
import { SEED_COUNT, drawer, signIn } from './helpers.js';

const NEW_PATIENT = {
  name: 'Grace Hopper',
  email: 'grace.hopper@example.com',
  address: '1 Compiler Way, Capital City',
  dateOfBirth: '1906-12-09',
};

async function openIntake(page) {
  await page.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: 'Intake' }).click();
  await expect(page.getByRole('heading', { name: 'Register a patient.' })).toBeVisible();
}

test.describe('Intake', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await openIntake(page);
  });

  // validate() mirrors PatientRequestDTO. Registered is not in this list: the
  // form pre-fills it with today, so it is the one field that cannot be empty.
  test('refuses an empty form, one message per field', async ({ page }) => {
    await page.getByRole('button', { name: 'File intake' }).click();

    await expect(page.getByText('Name is required')).toBeVisible();
    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page.getByText('Address is required')).toBeVisible();
    await expect(page.getByText('Date of birth is required')).toBeVisible();
    await expect(drawer(page).getByText(`${SEED_COUNT} filed`)).toBeVisible();
  });

  test('refuses an address that is not an email', async ({ page }) => {
    await page.getByLabel('Full name').fill(NEW_PATIENT.name);
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Address').fill(NEW_PATIENT.address);
    await page.getByLabel('Date of birth').fill(NEW_PATIENT.dateOfBirth);
    await page.getByRole('button', { name: 'File intake' }).click();

    await expect(page.getByText('Email should be valid')).toBeVisible();
  });

  // The registry refuses a duplicate email the same way patient-service does,
  // so the console has to surface it on the field rather than swallowing it.
  test('refuses an email already on file', async ({ page }) => {
    await page.getByLabel('Full name').fill('Another John');
    await page.getByLabel('Email').fill('john.doe@example.com');
    await page.getByLabel('Address').fill('2 Second St, Springfield');
    await page.getByLabel('Date of birth').fill('1990-01-01');
    await page.getByRole('button', { name: 'File intake' }).click();

    await expect(page.getByText('Email address already exists')).toBeVisible();
    await expect(drawer(page).getByText(`${SEED_COUNT} filed`)).toBeVisible();
  });

  test('files a valid intake and shows the three copies', async ({ page }) => {
    await page.getByLabel('Full name').fill(NEW_PATIENT.name);
    await page.getByLabel('Email').fill(NEW_PATIENT.email);
    await page.getByLabel('Address').fill(NEW_PATIENT.address);
    await page.getByLabel('Date of birth').fill(NEW_PATIENT.dateOfBirth);
    await page.getByRole('button', { name: 'File intake' }).click();

    await expect(page.getByRole('heading', { name: 'Three copies, three services.' })).toBeVisible();
    await expect(page.getByText('Intake filed')).toBeVisible();
    await expect(drawer(page).getByRole('listitem')).toHaveCount(SEED_COUNT + 1);
    await expect(drawer(page).getByRole('button', { name: 'Hopper, Grace' })).toBeVisible();
  });

  test('opens the record it just filed', async ({ page }) => {
    await page.getByLabel('Full name').fill(NEW_PATIENT.name);
    await page.getByLabel('Email').fill(NEW_PATIENT.email);
    await page.getByLabel('Address').fill(NEW_PATIENT.address);
    await page.getByLabel('Date of birth').fill(NEW_PATIENT.dateOfBirth);
    await page.getByRole('button', { name: 'File intake' }).click();

    await page.getByRole('button', { name: 'Open the record' }).click();

    await expect(page.getByRole('heading', { name: NEW_PATIENT.name })).toBeVisible();
    await expect(page.getByText(NEW_PATIENT.email)).toBeVisible();
  });

  test('clears the form on request', async ({ page }) => {
    await page.getByLabel('Full name').fill(NEW_PATIENT.name);
    await page.getByLabel('Email').fill(NEW_PATIENT.email);

    await page.getByRole('button', { name: 'Clear form' }).click();

    await expect(page.getByLabel('Full name')).toHaveValue('');
    await expect(page.getByLabel('Email')).toHaveValue('');
  });
});
