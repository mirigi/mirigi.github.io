# Demo-Request Form → Google Sheet Setup

This connects the website's "Schedule a demo" modal to a Google Spreadsheet you own.
No third-party services, no servers — submissions are written straight into your Sheet
by a small Google Apps Script. One-time setup, ~10 minutes.

---

## 1. Create the spreadsheet

1. Go to <https://sheets.google.com> and create a **new blank spreadsheet**.
2. Name it e.g. **"Mirigi — Demo Requests"**.
3. In the first row, paste these **column headers** (exactly, in this order):

   | A | B | C | D | E | F | G | H | I |
   |---|---|---|---|---|---|---|---|---|
   | Timestamp | Full name | Email | Phone | Country | Building size | Comments | Language | Source |

   (The script writes columns in this order. Keep them in sync if you rename them.)

---

## 2. Add the Apps Script

1. In the spreadsheet menu: **Extensions → Apps Script**.
2. Delete any starter code in `Code.gs` and paste the script below.
3. Click **Save** (💾).

```javascript
// Mirigi demo-request endpoint. Appends each submission as a row.
var SHEET_NAME = 'Sheet1'; // change if your tab is named differently

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // --- spam defense (mirrors the client-side checks) ---
    if (data.company_url) return _json({ ok: true });          // honeypot tripped
    if (typeof data.elapsed_ms === 'number' && data.elapsed_ms < 2000) {
      return _json({ ok: true });                              // submitted too fast
    }

    // --- minimal validation: name + (email or phone) ---
    var name = (data.name || '').toString().trim();
    var email = (data.email || '').toString().trim();
    var phone = (data.phone || '').toString().trim();
    if (!name || (!email && !phone)) {
      return _json({ ok: false, error: 'missing_required' });
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME)
             || SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    sheet.appendRow([
      new Date(),                                  // Timestamp (server-side)
      name,
      email,
      phone,
      (data.country || '').toString().trim(),
      (data.building_size || '').toString().trim(),
      (data.comments || '').toString().slice(0, 300),
      (data.language || '').toString(),
      (data.source || '').toString()
    ]);

    return _json({ ok: true });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  }
}

// GET handler so you can open the URL in a browser to confirm it's live.
function doGet() {
  return _json({ ok: true, status: 'Mirigi demo endpoint is running' });
}

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

> If your sheet tab is **not** called `Sheet1`, change `SHEET_NAME` at the top — or
> leave it; the script falls back to the first tab automatically.

---

## 3. Deploy as a Web App

1. Top-right: **Deploy → New deployment**.
2. Click the gear ⚙ next to "Select type" → choose **Web app**.
3. Fill in:
   - **Description:** `Mirigi demo form`
   - **Execute as:** **Me** (your account)
   - **Who has access:** **Anyone**  ← important; the website calls it anonymously
4. Click **Deploy**.
5. Google asks you to **Authorize access** → pick your account → if you see
   "Google hasn't verified this app", click **Advanced → Go to (project name)** →
   **Allow**. (This is normal for your own scripts.)
6. Copy the **Web app URL**. It ends in **`/exec`** and looks like:
   `https://script.google.com/macros/s/AKfy....../exec`

> **Test it now:** paste that `/exec` URL into a browser. You should see
> `{"ok":true,"status":"Mirigi demo endpoint is running"}`.

---

## 4. Plug the URL into the website

1. Open **`_config.yml`** in the site repo.
2. Set the value you copied:

   ```yaml
   demo_form_endpoint: "https://script.google.com/macros/s/AKfy....../exec"
   ```

3. Rebuild / redeploy the site (e.g. `docker run … ` per the README, or your normal
   deploy). The modal is now live — submissions land in your Sheet.

> Leaving `demo_form_endpoint` empty disables submitting (the form shows the
> "email us directly" fallback), so the site never breaks if the URL isn't set yet.

---

## Updating the script later

If you edit the Apps Script, you must **redeploy** for changes to take effect:
**Deploy → Manage deployments → (your deployment) → Edit ✏ → Version: New version → Deploy.**
The `/exec` URL stays the same, so you don't need to touch `_config.yml` again.

## Tips

- **Email alerts on new leads:** in the Sheet, *Tools → Notification settings* (or add a
  `MailApp.sendEmail(...)` line inside `doPost`) to get pinged on every submission.
- **Spam:** the honeypot + 2-second time-gate are enforced on both the page and the
  script. If you ever see junk, you can add Google reCAPTCHA later.
- **Privacy:** all data stays in your Google account. Nothing passes through Mirigi or
  any third party.
