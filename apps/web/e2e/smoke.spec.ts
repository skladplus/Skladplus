import { expect, test } from '@playwright/test'

test('головна сторінка відкривається', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('Skladplus')
  await expect(page.getByRole('heading', { name: 'Skladplus' })).toBeVisible()
})

test('/api/health відповідає 200', async ({ request }) => {
  const response = await request.get('/api/health')

  expect(response.status()).toBe(200)
  await expect(response).toBeOK()
  await expect(response.json()).resolves.toMatchObject({
    status: 'ok',
    database: 'ok',
  })
})
