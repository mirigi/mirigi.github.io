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
// Mirigi demo-request endpoint. Appends each submission as a row AND emails
// the team a copy. The spreadsheet stays the system of record; the email is
// just a notification.
var SHEET_NAME = 'Sheet1'; // change if your tab is named differently
var NOTIFY_EMAILS = 'support@mirigi.com,support@khimo.com'; // comma-separated

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

    var lead = {
      name: name,
      email: email,
      phone: phone,
      country: (data.country || '').toString().trim(),
      building_size: (data.building_size || '').toString().trim(),
      comments: (data.comments || '').toString().slice(0, 300),
      language: (data.language || '').toString(),
      source: (data.source || '').toString()
    };

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME)
             || SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    sheet.appendRow([
      new Date(),                                  // Timestamp (server-side)
      lead.name,
      lead.email,
      lead.phone,
      lead.country,
      lead.building_size,
      lead.comments,
      lead.language,
      lead.source
    ]);

    // Email the team. Wrapped so a mail failure never blocks the submission
    // (the row is already saved, and the visitor still gets a success reply).
    try { _notify(lead); } catch (mailErr) { /* logged below, non-fatal */
      console.error('notify failed: ' + mailErr);
    }

    return _json({ ok: true });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  }
}

// Sends the lead to NOTIFY_EMAILS as a readable email.
function _notify(lead) {
  var rows = [
    ['Name', lead.name],
    ['Email', lead.email || '—'],
    ['Phone', lead.phone || '—'],
    ['Country', lead.country || '—'],
    ['Building size', lead.building_size || '—'],
    ['Comments', lead.comments || '—'],
    ['Language', lead.language || '—'],
    ['Source', lead.source || '—'],
    ['Received', new Date().toString()]
  ];

  var subject = 'New demo request: ' + lead.name +
                (lead.country ? ' (' + lead.country + ')' : '');
  var body = rows.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n');
  var htmlBody = '<h3>New demo request</h3><table cellpadding="4">' +
    rows.map(function (r) {
      return '<tr><td><strong>' + _esc(r[0]) + '</strong></td><td>' + _esc(r[1]) + '</td></tr>';
    }).join('') + '</table>';

  var options = { name: 'Mirigi Website', htmlBody: htmlBody };
  // Reply-To the lead's email when present, so a reply reaches them directly.
  if (lead.email) options.replyTo = lead.email;

  MailApp.sendEmail(NOTIFY_EMAILS, subject, body, options);
}

function _esc(s) {
  return s.toString()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// --- Diagnostic: run THIS from the editor to test email + grant permission ---
// Select `testEmail` in the toolbar's function dropdown and click Run.
// First run triggers the send-email authorization prompt (Allow it).
// If it still fails, the editor shows the exact error here.
//
// Sample leads use a renowned woman designer per language + reserved-for-docs
// contact details (example.com per RFC 2606, 555-01xx fictional numbers), so
// the data is elegant and carries no legal exposure.
var TEST_LEADS = {
  en: { name: 'Eileen Gray',        email: 'eileen.gray@example.com',        phone: '+1 555 0142', country: 'Ireland' },
  es: { name: 'Clara Porset',       email: 'clara.porset@example.com',       phone: '+1 555 0153', country: 'Mexico'  },
  fr: { name: 'Charlotte Perriand', email: 'charlotte.perriand@example.com', phone: '+1 555 0164', country: 'France'  },
  pt: { name: 'Lina Bo Bardi',      email: 'lina.bobardi@example.com',       phone: '+1 555 0175', country: 'Brazil'  }
};

function testEmail(lang) {
  lang = lang || 'en';
  var who = TEST_LEADS[lang] || TEST_LEADS.en;
  _notify({
    name: who.name, email: who.email, phone: who.phone,
    country: who.country, building_size: '101-200',
    comments: 'This is a test from the Apps Script editor.',
    language: lang, source: 'testEmail(' + lang + ')'
  });
  Logger.log('testEmail[' + lang + ']: MailApp.sendEmail returned without throwing. ' +
             'Quota left today: ' + MailApp.getRemainingDailyQuota());
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

> **To change who gets notified**, edit `NOTIFY_EMAILS` at the top (comma-separated list).

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

> **First time you save the email version:** Google will ask you to **re-authorize**
> because the script now needs permission to **send email** (`MailApp`). Run `doPost`
> once from the editor (or just Save and follow the authorization prompt) and **Allow**.
> Emails are sent from the Google account that owns the script. Heads-up: consumer
> Gmail accounts can send ~100 emails/day via Apps Script — plenty for demo leads.

## Not receiving the emails? (row saves but no email)

The row still lands in the Sheet but no email arrives — that means the email step
failed silently (it's intentionally wrapped so it never breaks a submission). Work
through these, most likely first:

1. **Run `testEmail()` from the editor.** Open Apps Script, pick `testEmail` in the
   function dropdown, click **Run**. This is the fastest diagnosis:
   - If Google shows an **authorization prompt** → that was the problem. **Allow** the
     *send email* permission, then re-test the form. (Adding `MailApp` needs a fresh
     consent the web-app deployment didn't have.)
   - If it throws an error → the editor shows exactly why (read it / **View → Executions**).
   - If it says "returned without throwing" but no mail arrives → check **spam** in the
     `support@mirigi.com` and `support@khimo.com` inboxes (mail from a Gmail account to
     your own domains can get filtered). Also confirm those addresses actually exist.

2. **Check the execution log.** **View → Executions** in the editor shows each `doPost`
   call; a failed send logs `notify failed: …` with the reason.

3. **Confirm the deployment runs the new code.** Editing `Code.gs` is not enough — you
   must **Deploy → Manage deployments → Edit ✏ → Version: *New version* → Deploy**.
   If you created a brand-new deployment, make sure the site's `demo_form_endpoint`
   points at *that* deployment's `/exec` URL.

4. **Check "Execute as".** In the deployment settings it must be **Execute as: Me**
   (the owner). If it's set to "User accessing the web app", anonymous visitors have no
   email identity and `MailApp` can't send.

> 90% of the time it's #1 — the new send-email permission was never granted, because the
> authorization prompt only appears when *you* run the script in the editor, not when the
> website POSTs to it anonymously. Running `testEmail()` once fixes it.

## Tips

- **Email alerts on new leads:** built in — every submission is emailed to the
  addresses in `NOTIFY_EMAILS` (currently `support@mirigi.com`, `support@khimo.com`)
  in addition to being written to the Sheet. Edit that constant to change recipients.
- **Spam:** the honeypot + 2-second time-gate are enforced on both the page and the
  script. If you ever see junk, you can add Google reCAPTCHA later.
- **Privacy:** all data stays in your Google account. Nothing passes through Mirigi or
  any third party.
