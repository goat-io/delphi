Your task is not ready until you have properly tested it in the browser.
Please make sure to use the chrome to test the functionality.

Remember that <https://sodium.local.getsodium.com/> is a local URL that we are proxying with Nginx Proxy Manager, a local Docker service.
For Sodium platform admin: <https://sodium.local.getsodium.com/>

Please read any other docs in apps/frontend/agents that you find relevant for your task.

Then, make sure that the functionality you are building or debugging works properly.

---

## Chrome Remote Debugging (when Chrome MCP is not available)

If Chrome DevTools MCP tools are not connected, you can use Chrome DevTools Protocol (CDP) directly:

### 1. Launch Chrome with remote debugging

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="/tmp/chrome-debug-profile" \
  "https://sodium.local.getsodium.com/" &
```

### 2. Open a page

```bash
# List tabs
curl -s "http://localhost:9222/json"

# Open new tab (must use PUT)
curl -s -X PUT "http://localhost:9222/json/new?https://sodium.local.getsodium.com/"
```

### 3. Interact via WebSocket (Python)

Use `pip3 install --break-system-packages websockets` if not installed.

```python
import json, base64, asyncio, websockets

TAB_ID = "<tab-id-from-step-2>"

async def interact():
    ws_url = f"ws://localhost:9222/devtools/page/{TAB_ID}"
    msg_id = 0

    async def send_cmd(ws, method, params=None):
        nonlocal msg_id
        msg_id += 1
        msg = {"id": msg_id, "method": method}
        if params:
            msg["params"] = params
        await ws.send(json.dumps(msg))
        while True:
            raw = await ws.recv()
            result = json.loads(raw)
            if result.get("id") == msg_id:
                return result

    async with websockets.connect(ws_url, max_size=50*1024*1024) as ws:
        # Evaluate JS in the page
        result = await send_cmd(ws, "Runtime.evaluate", {
            "expression": "JSON.stringify({url: location.href, cookies: document.cookie})"
        })
        print(result.get('result', {}).get('result', {}).get('value'))

        # Take screenshot
        result = await send_cmd(ws, "Page.captureScreenshot", {"format": "png"})
        img_data = base64.b64decode(result["result"]["data"])
        with open("/tmp/screenshot.png", "wb") as f:
            f.write(img_data)

asyncio.run(interact())
```

### 4. Common CDP actions

**Navigate:**
```python
await send_cmd(ws, "Page.navigate", {"url": "https://sodium.local.getsodium.com/admin"})
```

**Focus and type into an input:**
```python
await send_cmd(ws, "Runtime.evaluate", {
    "expression": "document.querySelector('input[placeholder*=\"example\"]').focus()"
})
await send_cmd(ws, "Input.insertText", {"text": "testuser@test.getsodium.com"})
```

**Click a button:**
```python
await send_cmd(ws, "Runtime.evaluate", {
    "expression": "[...document.querySelectorAll('button')].find(b => b.textContent.includes('Continue')).click()"
})
```

**Paste into OTP inputs** (React OTP components need paste events, not insertText):
```python
await send_cmd(ws, "Runtime.evaluate", {
    "expression": """
        (() => {
            const input = document.querySelectorAll('input[aria-label^="OTP digit"]')[0];
            input.focus();
            const pasteData = new DataTransfer();
            pasteData.setData('text/plain', '000000');
            input.dispatchEvent(new ClipboardEvent('paste', {
                clipboardData: pasteData, bubbles: true, cancelable: true
            }));
        })()
    """
})
```

**Read page state:**
```python
result = await send_cmd(ws, "Runtime.evaluate", {
    "expression": "JSON.stringify({url: location.href, hasToken: document.cookie.includes('token='), text: document.body.innerText.substring(0, 300)})"
})
```

### 5. Cleanup

```bash
pkill -f "remote-debugging-port=9222"
```

---

## OTP Login Flow (Local Dev)

For test emails matching the pattern (e.g. `testuser@test.getsodium.com`), the OTP is always `000000` in local/dev/test environments. See `apps/backend/src/services/auth/better-auth.factory.ts` for the `generateOTP` config.

**Steps:**
1. Navigate to `https://sodium.local.getsodium.com/`
2. Enter email (e.g. `testuser@test.getsodium.com`)
3. Click "Continue with Email"
4. Enter OTP `000000` (or paste it — the OTP component auto-submits on paste)
5. User is authenticated and redirected to `/admin`

---

## Assigning Admin Roles

To access the admin panel at `/admin`, a user needs the `MARKETPLACE_EMPLOYEE_ADMIN` role on the `sodium-platform` tenant.

### Assign role

```bash
cd apps/backend
TENANT_ID=sodium-platform APP_ENV=local pnpm script platform/account/assignRole <email> MARKETPLACE_EMPLOYEE_ADMIN
```

Example:
```bash
TENANT_ID=sodium-platform APP_ENV=local pnpm script platform/account/assignRole testuser@test.getsodium.com MARKETPLACE_EMPLOYEE_ADMIN
```

### Remove role

```bash
TENANT_ID=sodium-platform APP_ENV=local pnpm script platform/account/removeRole <email> MARKETPLACE_EMPLOYEE_ADMIN
```

### List roles for a user

```bash
TENANT_ID=sodium-platform APP_ENV=local pnpm script platform/account/listRoles <email>
```

### Available roles

| Role | ID | Purpose |
|------|----|---------|
| `MARKETPLACE_EMPLOYEE_ADMIN` | `631ce36f014938be39818a5c` | Platform/Tenant admin |
| `APP_USER` | `631ce36f014938be39818a5d` | Regular user |
| `ACCOUNT_OWNER` | `631ce36f014938be39818a5e` | Account owner |
| `ACCOUNT_EDITOR` | `631ce36f014938be39818a5f` | Can edit accounts |
| `ACCOUNT_VIEWER` | `631ce36f014938be39818a60` | Read-only access |

The `isSodiumPlatformAdmin` check in `AdminLayout.tsx` requires BOTH:
1. The `MARKETPLACE_EMPLOYEE_ADMIN` role on the account
2. The tenant being `sodium-platform`

See `packages/shared-frontend-schemas/src/states/authorization/authorization.context.ts` for the implementation.
