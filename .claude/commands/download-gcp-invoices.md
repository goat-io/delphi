# Download GCP Billing Invoices

Download Google Cloud Platform billing invoice PDFs using Playwright browser automation.

## Prerequisites

- Playwright MCP server must be running
- User must be available to provide password and confirm 2FA

## Authentication Flow

**IMPORTANT:** Before starting, inform the user:
1. You will need their Google account password
2. They will need to confirm 2FA on their device (tap "Yes" on the notification)

**Email:** `ignacio.cabrera@goatlab.io` (hardcoded, do not ask)

## Step-by-Step Flow

### Step 1: Navigate to GCP Billing

```javascript
// Use mcp__playwright__browser_navigate
await browser_navigate({ url: "https://console.cloud.google.com/billing" });
```

This will redirect to Google Sign-in.

### Step 2: Enter Email (Hardcoded)

```javascript
// Use mcp__playwright__browser_type
await browser_type({
  element: "Email input",
  ref: "<email_input_ref>",  // Usually textbox "Email or phone"
  text: "ignacio.cabrera@goatlab.io",
  submit: true
});
```

### Step 3: Enter Password

**ASK USER:** "Please enter your Google password:"

```javascript
// Use mcp__playwright__browser_type
await browser_type({
  element: "Password input",
  ref: "<password_input_ref>",  // Usually textbox "Enter your password"
  text: "<USER_PASSWORD>",
  submit: true
});
```

### Step 4: Wait for 2FA

**TELL USER:** "Please check your device and tap 'Yes' on the 2FA notification. Let me know when done."

**WAIT** for user confirmation before proceeding.

### Step 5: Select Billing Account

After login, you'll see a list of billing accounts. Take a snapshot to see available accounts:

```javascript
await browser_snapshot();
```

Click on the desired billing account link (e.g., "Agrosocial - Goatlab AB").

### Step 6: Navigate to Invoices

Click on "Invoices (Documents)" in the left sidebar under "Payments" section.

```javascript
// Find and click the Invoices link
await browser_click({
  element: "Invoices Documents link",
  ref: "<invoices_link_ref>"
});
```

### Step 7: Select Invoice(s)

The page loads in an iframe. Use `browser_run_code` to interact:

```javascript
// Select invoice checkbox (e.g., first/most recent invoice)
await browser_run_code({
  code: `async (page) => {
    const frame = page.frameLocator('iframe[name="billing-iframeIframe"]');
    const checkbox = frame.locator('table tbody tr').first().locator('[role="checkbox"]').first();
    await checkbox.click({ force: true });
    return 'selected';
  }`
});
```

### Step 8: Click on Invoice Row to Open Details

```javascript
// Click on invoice row to open detail panel
await browser_run_code({
  code: `async (page) => {
    const frame = page.frameLocator('iframe[name="billing-iframeIframe"]');
    const row = frame.locator('table tbody tr').first();
    await row.click();
    return 'clicked';
  }`
});
```

### Step 9: Open Actions Menu

```javascript
// Click Actions dropdown in detail panel
await browser_run_code({
  code: `async (page) => {
    const frame = page.frameLocator('iframe[name="billing-iframeIframe"]');
    const actionsBtn = frame.locator('[aria-haspopup="true"]').filter({ hasText: 'Actions' });
    await actionsBtn.click({ force: true });
    await page.waitForTimeout(500);
    return 'opened';
  }`
});
```

### Step 10: Click Download

```javascript
// Click Download menu item
await browser_click({
  element: "Download menu item",
  ref: "<download_menuitem_ref>"  // menuitem "Download"
});
```

### Step 11: Confirm PDF Download

A dialog appears with CSV/PDF options. PDF is pre-selected.

```javascript
// Click Download button in dialog
await browser_click({
  element: "Download button",
  ref: "<download_button_ref>"  // button "Download" in dialog
});
```

### Step 12: Wait and Retrieve File

```javascript
// Wait for download
await browser_wait_for({ time: 3 });

// Switch to download tab to trigger file save
await browser_tabs({ action: "select", index: 1 });
```

The PDF will be saved to `.playwright-mcp/` directory.

### Step 13: Move File to Target Location

```bash
mkdir -p billing-invoices
mv .playwright-mcp/*.pdf billing-invoices/
```

## Downloading Multiple Invoices

To download multiple invoices, repeat steps 7-12 for each invoice row. The invoice rows are indexed in the table:

```javascript
// Select Nth invoice (0-indexed)
await browser_run_code({
  code: `async (page) => {
    const frame = page.frameLocator('iframe[name="billing-iframeIframe"]');
    const rows = frame.locator('table tbody tr');
    const targetRow = rows.nth(N);  // Replace N with index
    await targetRow.click();
    return 'selected';
  }`
});
```

## Billing Account IDs (Reference)

| Account | ID | Currency |
|---------|-----|----------|
| Agrosocial | 0119F7-E7B8FE-748A46 | USD |
| Agrosocial - Goatlab AB | 011EB1-57C2B7-52E2D6 | SEK |
| Gealium - Goatlab AB | 014651-C61E93-390347 | SEK |
| GOAT - BILLING ACCOUNT | 018F01-709F29-AD0ECD | USD |
| sodium - state | 0139AD-FF026D-89E1D0 | SEK |

## Troubleshooting

### Element Not Clickable
Use `force: true` in click options or use `browser_run_code` with frameLocator.

### Cross-Origin Iframe Issues
Always use `page.frameLocator('iframe[name="billing-iframeIframe"]')` to interact with the billing iframe content.

### Notification Dialog Opens Instead
If clicking "Actions" opens the notifications panel, the click hit the wrong element. Use more specific selectors via `browser_run_code`.

## Output

Files are saved to `billing-invoices/` with the invoice number as filename (e.g., `5434489724.pdf`).
