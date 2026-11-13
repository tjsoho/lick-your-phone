# Email to send: the two ClickUp steps

**Subject:** Two ClickUp steps in the onboarding automation have never worked

---

Hi Rita,

While testing the new onboarding flow end to end I found two steps that have
never once succeeded. They are in NSW Add-Ons (2458024), so they are in the
live automation too, not just our copy.

**What is happening**

Two steps try to set a task to the status **"dedicated smm/am"** on the
**Client Onboarding** list:

1. "Onboarding status change"
2. "Clone Onboarding Task to Account - Active"

ClickUp rejects both with `400 ITEM_114: Status does not exist`.

Both steps are wrapped in an "ignore the error" instruction, so the run still
reports Success and nothing is flagged. That is why it has gone unnoticed.

**What this means in practice**

After a client submits the onboarding form, the onboarding task is never moved
on, and nothing is ever marked as Account Active. Someone has presumably been
doing both by hand.

**What I need from you**

Three answers and I can fix it today.

1. When a client finishes the onboarding form, what status should the
   **onboarding task** be moved to? Please give me the exact status name as it
   reads in ClickUp.

2. The second step is named "Clone Onboarding Task to Account - Active".
   Should it be acting on the **accounts task** rather than the onboarding
   task? If so, what status should the accounts task be set to, exactly as it
   reads in ClickUp?

3. Is "dedicated smm/am" still a live status anywhere? If it was renamed, what
   is it called now?

If it is easier to show me than type it, a screenshot of the status list on
both the Client Onboarding list and the Accounts list would do the job.

One thing to flag: I do not want to guess at these. Setting the wrong status
would move real client tasks into the wrong place, so I would rather wait for
the exact names from you.

Thanks,
Toby
