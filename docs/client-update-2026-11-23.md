# What we changed, 23 November 2026

Everything below is live on the portal and in the automations. Each one has
been run start to finish on the real site, not just on a test copy.

## The list

- [x] **1. The proposal email now actually sends.** It was going to a service
      that had been switched off, so every send since went nowhere, and the
      button still said "sent". It now goes out through the same system as the
      rest of the automations, and if it fails the button tells you instead of
      pretending. The resend button on the proposal page uses the same path, so
      resending works too.

- [x] **2. Two links per proposal.** The proposal page now gives you a client
      link and a separate team link. The deck looks identical on both. Opening
      the team link records nothing, so checking a proposal yourself no longer
      shows up as the client having read it. "Open deck" on the admin page uses
      the team link. The client link is the one to email or paste into HubSpot.

- [x] **4. The summary is grouped by term.** Everything the client has chosen is
      now sorted into 18 months, 12 months, 6 months, one-off payment, and
      complimentary last. The length sits on the group heading, so it is not
      repeated on every line.

- [x] **5. The side panel is gone from the signing page.** The basket and its
      Sign button no longer appear while the client is reading and signing the
      agreement. There is one Sign button on the page and nothing else.

- [x] **6. The client's signature is black on the contract.** The signing pad
      still draws in white, because the slide behind it is nearly black and the
      client needs to see what they are signing. The signature is turned black
      on the way into the PDF, so the contract has black ink.

- [x] **8. The signing notification goes to info@.** When a client signs, a
      notification now goes to info@lickyourphone.com with their name, business,
      email, ABN, the total, a link to the signed contract and a link to their
      onboarding form. The Slack post goes to the shared client-contracts
      channel as before. Nothing is sent to one person's inbox.

- [x] **9. The old welcome email is gone.** The "Click here to get started"
      email that went out at signing has been removed.

- [x] **10. The payment activation email comes from accounts@.** The sender on
      that one email has been changed to accounts@lickyourphone.com. Please
      check the sender line when it arrives, see the note at the bottom.

- [x] **11. Sales notes reach ClickUp.** They never did. They were saved on the
      proposal, the automation had a field for them that was never filled, and
      the panel wrongly claimed they fed the ClickUp brief. The note you write
      at sign off is now added to the bottom of the Client Onboarding task
      description, under a heading, with the existing brief left intact.

- [x] **12. Nothing reaches the team until sales signs off.** Submitting the
      onboarding form used to fire everything at once, so Slack announced a
      finished client while their answers were still unread. Now:
      - The client submits and gets their two emails straight away.
      - Sales gets a Slack post saying a form is waiting, with a link to it.
      - Sales reads the answers, writes their notes, and presses Sign off.
      - Only then do Drive, ClickUp and the team Slack post happen.
      Pressing Sign off twice cannot fire it twice. If the client goes back and
      changes an answer, the checkpoint reopens so the new version gets read.

- [x] **13. "Other Team Members" works.** The question had been saved with no
      fields in it, so the client saw an empty "Entry 1" box with nothing to
      type into. It now asks for first name, last name, role, email and phone,
      and you can add as many people as you like. A question saved with no
      fields now shows nothing at all rather than an empty box.

- [x] **The browser tab icon** is the LickYourPhone lips mark everywhere,
      instead of the default placeholder.

- [x] **A fault we found while testing.** On the live site, signing a contract
      and submitting the onboarding form were both handing their work to the
      automations and then closing the door before the handover finished. We
      caught a real signature on the live site doing exactly that: the contract
      was signed, and nothing reached Drive, ClickUp or Slack, with no error
      anywhere. That is fixed, and the fix is what the tests below confirm.

## How to test it yourself

Do it on the real site. Give the test client an obvious name such as
"ZZ TEST IGNORE Smith" so nobody mistakes it for a real one.

**The proposal email**

1. Make a proposal, set the client email to your own, press Send.
2. The email arrives with a button to open the deck. Check the link opens it.
3. Go back to the proposal and press Resend. A second copy arrives.
4. If anything is wrong the button will say so rather than saying "sent".

**The two links**

5. On the proposal page, copy the Team link and open it. Read a few slides.
6. The proposal should still show as not opened by the client.
7. Now open the Client link. That one does count as a client open.

**The summary and the signing page**

8. Open the client link and choose a few services on different terms.
9. On the summary, check they are grouped: 18 months, 12 months, 6 months,
   one-off, complimentary last.
10. Go on to the signing page. There should be no basket panel and no second
    Sign button.
11. Sign it. Download the agreement from the All Done screen and check the
    signature is black.

**The signing notifications**

12. info@lickyourphone.com gets an email saying the proposal was signed.
13. The client-contracts Slack channel gets a post saying the same.
14. Nobody gets a "Click here to get started" email any more.

**The sign off gate**

15. Fill in the onboarding form as the client and submit it.
16. The client gets two emails. Check the payment one says accounts@.
17. Slack gets a post saying a form is waiting to be signed off, with a link.
18. Check ClickUp and Drive. Nothing new should have appeared yet. That is the
    gate holding.
19. Open the proposal in the admin. The Sign Off panel says "Waiting on you".
    Write a note and press Sign off.
20. Now ClickUp, Drive and the team Slack post all happen.
21. Open the Client Onboarding task in ClickUp. Your note is at the bottom of
    the description under "SALES NOTES AT SIGN OFF", with the original brief
    still above it.

**Other Team Members**

22. On step 2 of the onboarding form, press "Add another team member".
23. You should get first name, last name, role, email and phone to fill in.

## Two things to come back to us on

1. **Test markers are still switched on.** Every email and Slack post from the
   new automations still carries a "TEST, PLEASE IGNORE" banner, so your own
   testing is obvious to the team. Tell us when you are happy and we will take
   them off in one go. Do not put a real client through until they are off.

2. **The accounts@ sender.** We have set the payment email to send from
   accounts@lickyourphone.com. If that address has not been set up as an
   approved sender on the info@ mailbox, the email will quietly go out from
   info@ instead. When the test email arrives, please check the From line and
   tell us which it says.

Also, your list skipped numbers 3 and 7. If those were two more items, send
them over and we will pick them up.
