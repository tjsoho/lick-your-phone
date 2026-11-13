# Round 3: the portal now drives the automation

Everything below is live on lick-your-phone.vercel.app and in Make.

---

## Portal

### 1. A second proposal for an existing client no longer fails

Adding a client whose email was already on file stopped dead. It now reuses
the client record that is already there, and says which it did.

**Test:** New Proposal, use an email you have used before. It goes through.
The toast tells you it reused the existing client.

---

### 2. The ABN the client types wins

The team enters an ABN as a best guess before onboarding. The client types
the real one on the form. Their answer now overwrites the guess on the
client record.

**Test:** Put a wrong ABN on a client. Fill the onboarding form with the
right one. Open the client record. It shows the right one.

---

### 3. Primary contact: "Same as director"

A tick box above the primary contact fields. Ticking it copies the
director's first name and last name across.

**Test:** Onboarding form, primary contact section. Tick the box. The two
name fields fill in.

---

### 4. Director fields read first name, last name, email

Last name sits above the email now, so the three fields read in the order
you would say them.

**Test:** Onboarding form, director section. Look at the field order.

---

### 5. One step from payment to onboarding, not two

After approving payment details there were two buttons to get through:
"Continue to onboarding", then "Access onboarding". The second one is gone.

**Test:** Sign a proposal, approve payment details. It hands straight over.
A client who stops halfway and comes back still lands on the form.

---

### 6. Dragging questions

Moving a question to the last position works. It no longer snaps back a
second after it is dropped. A page that already has questions on it accepts
a drop.

**Test:** Onboarding Questions. Move a question to the bottom of a page, and
to another page. Reload. It stayed.

---

## Automation

### 7. The signed contract goes straight to Make

Make used to fetch the contract back out of PandaDoc by document id. The
portal is the document now, so it sends the whole picture itself: record id,
business name, ABN, contact, location, services signed, terms, pricing, the
PDF and the onboarding link.

PandaDoc is out of that path. The run takes about one minute instead of
three, because the 120 second wait for PandaDoc is gone.

**Test:** Sign a proposal. Watch the contract scenario in Make. One run,
Success, every module green.

---

### 8. The onboarding form goes straight to Make

Same story. The onboarding scenario was triggered by a Jotform, one per
state. The portal sends the finished form instead, under the same record id
the contract carried, so the two line up.

Drive folder and ClickUp task ids are read back out of the Backlog Data
record the contract run already wrote.

**Test:** Submit the onboarding form. The onboarding scenario fires within a
second or two. 16 operations, about 14 seconds.

---

### 9. The "what happens next" email

Sent to the client when they finish onboarding, from the onboarding flow.

**Test:** Finish the onboarding form with your own email on it. The email
arrives.

---

### 10. MAKE.COM ALERT emails

Every module in both scenarios that reaches outside Make now has an error
handler on it. If one fails you get an email at toby@vinciadvisory.com.au
with a red MAKE.COM ALERT banner, the scenario name, the module that broke,
the error message and the time.

The run is parked in Incomplete Executions rather than thrown away, so it
can be retried once the cause is fixed.

- Contract scenario: 54 modules covered
- Onboarding scenario: 16 modules covered

**Test:** Already tested. A deliberate failure was fired at the onboarding
webhook on 13 November. The run logged the error, sent the alert and parked
itself. Both the test execution and the test record were deleted afterwards.

---

## Still open

- **NSW Add-Ons is still on Jotform.** Scenario 2b handles it. Nothing has
  been retired, so it still works. Moving it into the portal is a separate
  job.
- **Stripe is still in the onboarding flow.** The client said billing moves
  to Pinch but only named Xero. Needs a decision before anything is changed.
- **2a and 2b are still live and untouched**, on purpose, until the new path
  is confirmed working by the client.
