import { test, expect } from '@playwright/test'

/**
 * Authentication flow E2E tests.
 *
 * These tests verify page rendering, form elements, error handling,
 * and redirect behavior for unauthenticated users. They do not
 * require a live Supabase connection since they test UI structure
 * and client-side behavior only.
 */

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('renders page title and branding', async ({ page }) => {
    // The page title is set via Next.js metadata
    await expect(page).toHaveTitle(/Sign in/i)

    // Brand heading visible
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()

    // Subtitle text visible
    await expect(page.getByText('Sign in to VitaMind')).toBeVisible()
  })

  test('renders email and password inputs', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i)
    await expect(emailInput).toBeVisible()
    await expect(emailInput).toHaveAttribute('type', 'email')

    const passwordInput = page.getByLabel(/password/i)
    await expect(passwordInput).toBeVisible()
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })

  test('renders submit button', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /sign in/i })
    await expect(submitButton).toBeVisible()
    await expect(submitButton).toBeEnabled()
  })

  test('shows error with invalid credentials', async ({ page }) => {
    // Fill in invalid credentials and submit
    await page.getByLabel(/email/i).fill('bad@example.com')
    await page.getByLabel(/password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()

    // The server action redirects back to /login with an error query param
    // which renders an Alert component. Wait for URL to contain error param
    // or for an alert/error element to appear.
    await expect(
      page.locator('[role="alert"], [data-variant="error"]').or(
        page.getByText(/invalid|error|incorrect|wrong/i)
      )
    ).toBeVisible({ timeout: 15_000 })
  })

  test('has link to register page', async ({ page }) => {
    const signUpLink = page.getByRole('link', { name: /sign up/i })
    await expect(signUpLink).toBeVisible()
    await expect(signUpLink).toHaveAttribute('href', '/register')
  })

  test('has legal links for privacy policy and terms', async ({ page }) => {
    const privacyLink = page.getByRole('link', { name: /privacy policy/i })
    await expect(privacyLink).toBeVisible()
    await expect(privacyLink).toHaveAttribute('href', '/privacy')

    const termsLink = page.getByRole('link', { name: /terms of service/i })
    await expect(termsLink).toBeVisible()
    await expect(termsLink).toHaveAttribute('href', '/terms')
  })

  test('has Google sign-in button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /continue with google/i })
    ).toBeVisible()
  })
})

test.describe('Register page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register')
  })

  test('renders page title and heading', async ({ page }) => {
    await expect(page).toHaveTitle(/Create account/i)

    await expect(
      page.getByRole('heading', { name: /create your account/i })
    ).toBeVisible()

    await expect(
      page.getByText('Start managing your life with AI')
    ).toBeVisible()
  })

  test('renders Google sign-up button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /continue with google/i })
    ).toBeVisible()
  })

  test('has link to login page', async ({ page }) => {
    const signInLink = page.getByRole('link', { name: /sign in/i })
    await expect(signInLink).toBeVisible()
    await expect(signInLink).toHaveAttribute('href', '/login')
  })

  test('has legal links for privacy policy and terms', async ({ page }) => {
    const privacyLink = page.getByRole('link', { name: /privacy policy/i })
    await expect(privacyLink).toBeVisible()
    await expect(privacyLink).toHaveAttribute('href', '/privacy')

    const termsLink = page.getByRole('link', { name: /terms of service/i })
    await expect(termsLink).toBeVisible()
    await expect(termsLink).toHaveAttribute('href', '/terms')
  })
})

test.describe('Auth redirects', () => {
  test('redirects unauthenticated user from /dashboard to /login', async ({ page }) => {
    await page.goto('/dashboard')

    // Middleware should redirect to /login
    await page.waitForURL('**/login**', { timeout: 10_000 })
    expect(page.url()).toContain('/login')
  })

  test('redirects unauthenticated user from /tasks to /login', async ({ page }) => {
    await page.goto('/tasks')

    await page.waitForURL('**/login**', { timeout: 10_000 })
    expect(page.url()).toContain('/login')
  })

  test('redirects unauthenticated user from /goals to /login', async ({ page }) => {
    await page.goto('/goals')

    await page.waitForURL('**/login**', { timeout: 10_000 })
    expect(page.url()).toContain('/login')
  })
})
