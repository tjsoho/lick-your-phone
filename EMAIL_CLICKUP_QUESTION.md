# Email to send: the two ClickUp steps

**Subject:** Two ClickUp steps in the onboarding automation have never worked

---

Hi Rita,

Testing the new onboarding flow end to end turned up two steps that have never
once succeeded. They are in NSW Add-Ons (2458024), so this is in the live
automation too, not just our copy.

**What is happening**

Two steps try to set a task to the status **dedicated smm/am**:

1. "Onboarding status change"
2. "Clone Onboarding Task to Account - Active"

Both point at the **Client Onboarding** list, in the **Services** space.
ClickUp rejects both every time with "Status does not exist", because
dedicated smm/am is not one of that space's statuses. These are:

onboarding form pending, waiting list!, check pinch / cc details, schedule
onboarding, internal setup, onboarding call, accounts check, strategy call,
wait for shoot, wait for content, internal approval, client approval, client
content approval, social media makeover, lost, service running

Both steps are wrapped in an "ignore the error" instruction, so the run still
reports Success and nothing is ever flagged. That is why it has gone
unnoticed.

**What it means in practice**

When a client submits the onboarding form, their onboarding task is never
moved on, and nothing is ever marked as account active. I assume someone on
the team has been doing both by hand.

**What I need from you**

Two answers and I can fix it today.

**1. The onboarding task.** When a client submits the onboarding form, which
status should their task move to? Pick one from the list above. My guess is
**check pinch / cc details**, since payment is the next thing that happens,
but that is a guess.

**2. The accounts task.** The second step is called "Clone Onboarding Task to
Account - Active", which reads like it is meant to act on the **accounts**
task in the Accounts space, not the onboarding task in Services. At the moment
it is pointed at the onboarding task. Two things:

   - Should it be acting on the accounts task instead?
   - Which status should that task move to? It is set to "set up payments"
     earlier in the flow, so I need the name of the one it should end on,
     exactly as it reads in ClickUp. Is dedicated smm/am a status on the
     Accounts list?

I do not want to guess at either of these. The wrong status would move real
client tasks into the wrong place, so I would rather have the exact names from
you. A screenshot of the status list on the Accounts list would answer most of
question 2 on its own.

Thanks,
Toby
