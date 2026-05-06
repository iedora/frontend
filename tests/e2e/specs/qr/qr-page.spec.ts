import { expect, test } from '@playwright/test'
import {
  apiCreateAndActivateOrg,
  apiSignup,
  uniqueSlug,
  uniqueUser,
} from '../../helpers/auth'

test.describe('QR code — dashboard page', () => {
  test('renders an SVG QR for the public menu URL and exposes downloads', async ({
    page,
  }) => {
    const owner = uniqueUser('qr')
    await apiSignup(page.request, owner)
    const org = await apiCreateAndActivateOrg(
      page.request,
      'QR Bistro',
      uniqueSlug('qr'),
    )

    await page.goto(`/dashboard/r/${org.slug}/qr`)

    // Server component prints the public URL it encoded.
    const expectedUrl = `http://localhost:3000/r/${org.slug}`
    await expect(page.getByText(expectedUrl)).toBeVisible()

    // Client renders an SVG QR — viewBox is the canonical signal that
    // qrcode.toString output landed in the DOM.
    const svg = page.getByTestId('qr-svg').locator('svg')
    await expect(svg).toBeVisible()
    await expect(svg).toHaveAttribute('viewBox', /^0 0 \d+ \d+$/)

    // Download SVG button triggers a real file download.
    const [svgDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('qr-download-svg').click(),
    ])
    expect(svgDownload.suggestedFilename()).toMatch(/^menu-qr-qr-bistro\.svg$/)

    // Download PNG works too.
    const [pngDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('qr-download-png').click(),
    ])
    expect(pngDownload.suggestedFilename()).toMatch(/^menu-qr-qr-bistro\.png$/)
  })

  test('dashboard restaurant page links to the QR page', async ({ page }) => {
    const owner = uniqueUser('qr-link')
    await apiSignup(page.request, owner)
    const org = await apiCreateAndActivateOrg(
      page.request,
      'Link Bistro',
      uniqueSlug('qr-link'),
    )

    await page.goto(`/dashboard/r/${org.slug}`)
    // Base UI's Button keeps role="button" even when rendered as an <a>, so
    // query by button role rather than link role.
    await page.getByRole('button', { name: 'QR code' }).click()
    await expect(page).toHaveURL(`/dashboard/r/${org.slug}/qr`)
    await expect(
      page.getByRole('heading', { name: 'QR code', exact: true }),
    ).toBeVisible()
  })
})
