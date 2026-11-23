# Trying to break it on the live site, 23 November 2026

Everything below was done on lick-your-phone.vercel.app, from both sides:
signed in as the owner in the dashboard, and as a client on the portal links.

## Four things broke. All four are fixed and re-tested on the live site.

### 1. A double-click on Sign produced two contracts and ran everything twice

The worst of them. The signing step read the proposal, checked it had not
been signed, and then let go of it before writing. Two clicks a fraction of a
second apart both got past that check and both ran the whole way through.

Reproduced on the live site with two clicks thirteen milliseconds apart. One
signature produced:

- two signed contract PDFs on file
- two runs of the automation
- two sets of ClickUp tasks
- two Drive uploads
- two Slack posts
- two emails to the office saying the client had signed

A client who double-taps, or presses again because the page seemed to hang,
was enough. Nothing warned anybody it had happened.

Fixed so the database decides: only one request can claim the signature, and
the loser throws away the spare contract and tells nobody. The client's screen
still moves on normally either way. Re-ran the identical two-click test
afterwards: one contract, one run.

### 2. The same fault on the onboarding form

Submitting had the same shape, so two submissions could both send the client
their emails and both tell sales a form was waiting. Fixed the same way. The
second one now gets the message a late submission already gets.

### 3. The team link could sign the client's agreement

The team link was built so a proposal could be checked without the visit
counting as a client open. It went all the way through to a working signature
pad, with nothing on screen to say it was the internal link. Anyone reading a
proposal to the end could sign on the client's behalf, which puts a contract
on file and sets off Drive, ClickUp, Slack and the email to the office.

Now that slide says "This is the team link" and sends you back to send the
client their own. The client's link still signs exactly as before. Both
checked on the live site after the fix.

### 4. Sign off was offered before the client had done anything

The Sign Off box appeared on every proposal, with a notes field and a button,
even on a client who had not opened their onboarding form. Pressing it was
refused, correctly, but only after somebody had written their notes, and the
wording above it said the client had finished when they had not. It now says
"Waiting on the client" until there is something to read.

While fixing that: the box also claimed that if the client changed an answer
the sign off would reopen. It cannot. Submitting the form is a one-way door
and the form locks afterwards. That wording is now honest.

## One thing we need your call on

### A returning client's second contract never gets a ClickUp onboarding task

This is in the original automation, not something we introduced, but the sign
off step now runs into it so you should know.

When a client who already has a Drive folder signs a **second** contract, the
automation treats them as an existing client and skips creating a Client
Onboarding task. The run reports success. What silently does not happen:

- the signed contract and the onboarding answers are never attached to a
  Client Onboarding task
- the task status never moves to "check pinch / cc details"
- the sales notes written at sign off never reach ClickUp

Their Drive folder, the Slack post and the accounts task all work normally.

Tested on the live site end to end with a real second contract for the same
business. So: **how should a second contract for an existing client behave?**
Should it get its own Client Onboarding task, or reuse the first one, or
something else? Tell us and we will wire it up.

## What we tried that held up

- Admin pages all bounce to the login screen when signed out.
- Made-up, expired or edited portal, team and onboarding links all show a
  clean "Link Not Found", no crash and no blank deck.
- Tried to reach the dashboard through a portal URL. No.
- A proposal with no services cannot be signed. It says so and sends you back.
- Sending a proposal for a client with no email address is refused with
  "This client has no email address on file", and the proposal stays unsent.
- Typed HTML into the onboarding form. It comes out as plain text in the PDF,
  not as formatting, so nothing can be smuggled into a document.
- Pressed Sign off in two windows at once. One run, one set of notes, and the
  second window was told it had already been signed off.

## Three smaller things worth knowing

1. **Two clients cannot share an email address.** The database will not allow
   it. If one person is the contact for two venues you will not be able to set
   both up under the same address. Worth deciding before it bites.

2. **Non-Latin alphabets do not render in the PDFs.** Japanese, Chinese,
   Arabic and so on come out as nonsense. Accents are completely fine, so
   Cafe, Crème, Señor, Hôtel and Müller all print correctly. Only a problem if
   you ever sign a client whose name is not in a Latin alphabet.

3. **A proposal that was never sent can still be signed** if someone has the
   link. Not reachable by guessing, and the team link can no longer sign, so
   this is now a small one.

## Test records left on the live site

All named so nobody mistakes them. Say the word and we will remove them.

| Business | What it was for |
| --- | --- |
| ZZ TEST IGNORE Signoff Venue | the sign off gate |
| ZZ TEST IGNORE Prod Venue | the proposal email |
| ZZ TEST IGNORE Prod2 Venue | full run, and the returning client test (2 proposals) |
| ZZ TEST IGNORE NoEmail Venue | sending with no email, and an empty proposal |
| ZZ TEST IGNORE Race Venue | the double-click, before the fix |
| ZZ TEST IGNORE Race2 Venue | the double-click, after the fix |
| ZZ TEST IGNORE TeamLink Venue | the team link signing check |

These also made real ClickUp tasks and Drive folders, all named ZZ TEST
IGNORE. Those need deleting in ClickUp and Drive by hand, as we have no
access to either.
