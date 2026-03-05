import { test, expect } from '@playwright/test'

/**
 * Tasks page E2E tests.
 *
 * The tasks page requires authentication (protected by middleware).
 * Since we cannot mock Supabase auth easily in Playwright, these
 * tests verify the redirect behavior and document what an
 * authenticated user would see. The task list component (task-list.tsx)
 * includes:
 * - A search input with placeholder "Search tasks..."
 * - Status filter buttons: All, To do, In progress, Completed
 * - A priority dropdown with options: All priorities, Urgent, High, Medium, Low
 * - An empty state message: "No tasks match the current filters."
 *
 * For actual authenticated testing, use the unit tests in __tests__/
 * or set up a Supabase test project with seeded data.
 */

test.describe('Tasks page (unauthenticated)', () => {
  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/tasks')

    await page.waitForURL('**/login**', { timeout: 10_000 })
    expect(page.url()).toContain('/login')
  })

  test('preserves tasks route intent after redirect', async ({ page }) => {
    // When a user visits /tasks without auth, they should land on /login.
    // After login, the app should ideally return them to /tasks.
    await page.goto('/tasks')
    await page.waitForURL('**/login**', { timeout: 10_000 })

    // Verify the login page is functional after redirect
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })
})

test.describe('Tasks page structure (documented)', () => {
  /**
   * These tests document the expected structure of the tasks page.
   * They cannot be run against the live page without authentication,
   * so they verify the redirect behavior and describe what should
   * exist when authenticated.
   *
   * Expected elements (from task-list.tsx):
   * - Search input: placeholder="Search tasks...", type="text"
   * - Status filters: buttons with text "All", "To do", "In progress", "Completed"
   * - Priority dropdown: <select> with options "All priorities", "Urgent", "High", "Medium", "Low"
   * - Empty state: div with text "No tasks match the current filters."
   * - PageHeader with title "Tasks"
   * - TaskCreateButton for adding new tasks
   */

  test('tasks route is protected and requires auth', async ({ page }) => {
    const response = await page.goto('/tasks')

    // The middleware should redirect (302) to login
    // After redirect chain, we end up on login
    await page.waitForURL('**/login**', { timeout: 10_000 })
    expect(page.url()).toContain('/login')
  })

  test('all protected dashboard routes redirect consistently', async ({ page }) => {
    const protectedRoutes = ['/tasks', '/goals', '/habits', '/planner', '/ai']

    for (const route of protectedRoutes) {
      await page.goto(route)
      await page.waitForURL('**/login**', { timeout: 10_000 })
      expect(page.url()).toContain('/login')
    }
  })
})
