# What changed

A plain list of the updates made to the proposal portal, newest section first.

## Adding a service (20 October 2026)

**Every service is now added the same way.** A service with a choice of term
already showed a row of price boxes with a tick in the corner, one per term.
A service with a single price showed a separate "I want this" switch beside
the price instead, which was a second way of doing the same thing.

It is now one price box with a tick, exactly like the term boxes. The price
sits inside the box, the tick turns green and the edge turns red when it is
chosen, and the whole box is clickable. Complimentary services work the same
way, with the word "Complimentary" where the price would be.

## Pricing shown per week (20 October 2026)

**Subscriptions are now priced per week.** Everywhere the client sees a price.
On the service slide, in the red bar at the top, in the basket, on Your
Summary and in the Investment Summary.

**Videography Subscription and Community Management stay per month.** They are
the only two.

**One-off services no longer say "per month".** Photography, Videography Reels,
Paid Partnership and the rest now read "one-off payment". Before this, a
$2,495 photography shoot looked like $2,495 every month on its own slide.

**One-off payments are no longer added into the running total.** The red bar
used to add a single payment into one monthly figure. It now shows the weekly
subscription total, with any one-off payments listed separately beside it.

**"Monthly Total" is now "Weekly Total".** There is no monthly figure in the
checkout at all. The basket, the Investment Summary and the signing card all
close on one number, and it is weekly. The monthly amount still appears on the
contract, which is what the client is actually billed against.

**The "You save" amount is bigger and bolder.** It is now the second largest
figure on the card, after the total itself.

**The "Offer ends" countdown now sits inside the Investment Summary card.** It
was already running in the strip at the top of the deck, but that is easy to
miss while reading the card. It now stands with the figures it applies to,
just above the Proceed button. It disappears once the proposal is signed.

**The same figures now appear on the signing page.** The card beside the
signature pad reads exactly as the Investment Summary does.

### Behind the scenes

All four places that show a price used to work the sums out separately. They
now share one set of rules, so they cannot drift apart.

The admin setting that controls whether a service is priced weekly or monthly
used to be a free text box, where a typo silently fell back to monthly. It is
now a two option picker, and a new service starts on weekly.

The contract PDF is unchanged. Billing is still monthly, so the contract still
states monthly amounts.

Opening a service on Your Summary still shows its weekly price with the
monthly equivalent beside it, for anyone who wants to check the maths.
