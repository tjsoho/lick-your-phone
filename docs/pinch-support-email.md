# Email to Pinch support

Send to: hello@getpinch.com.au

Subject: Adding a bank account from our own form, merchant mch_GTnCYqalLOy1Ml

---

Hello,

We are LickYourPhone Media, merchant ID mch_GTnCYqalLOy1Ml, with around 150
customers set up with you.

**What we want to do.** Our clients fill in one form on our own site, bank
account name, BSB and account number included. We want those details to go
straight to Pinch and be ready to debit. We do not want to send the client a
separate email or link to finish setting up somewhere else.

**What we tried.** We create the payer, then add the account:

    POST /live/payers
    POST /live/payers/<payer id>/sources
    { "sourceType": "bank-account",
      "bankAccountName": "...",
      "bankAccountBsb": "...",
      "bankAccountNumber": "..." }

Both return 200. The source is created, and reading the payer back shows an
agreement with status "active".

**Where it stops.** In the dashboard that customer shows:

    Pre-Approval Status:   No Pre-Approval
    Payment Instrument:    (blank)

A customer we set up the old way, through your hosted pre-approval page,
shows:

    Pre-Approval Status:   Unlimited Pre-Approval
    Payment Instrument:    Bank Account ending in 0745

So the API call appears to succeed but does not give us a pre-approval, and
nothing in the response tells us anything is missing.

**What we need from you.** How do we get a working pre-approval from details
the client has already given us on our own form, with no further step for
them? If that is possible through the API, please tell us the endpoint. If it
is not possible, please tell us that plainly so we can plan around it.

Is there someone on your API team we can talk to directly, or a better
channel than this address for a question like this?

Thank you,

Toby Carroll
on behalf of LickYourPhone Media
