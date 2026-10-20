# What changed

A plain list of the updates made to the proposal portal, newest section first.

## Free add-ons (20 October 2026)

**There is now a Complimentary tick box on every service.** It sits on the
service's card in the proposal's Presentation section, next to the discount.
Tick it and that service is given away on that proposal alone. The slide reads
"Complimentary" instead of a price, the basket and the summary say "Free", no
total counts it, and the agreement prints it as complimentary with no price
beside it.

**It is separate from the discount, which is the point.** A 100% discount also
makes a service free, but only while the offer countdown is running. Let the
timer lapse and the client is quoted full price for the thing they were
promised for nothing. The tick box does not look at the countdown at all.

The discount box is greyed out while a service is ticked, because there is no
price left to take anything off. Untick it and the discount comes back exactly
as it was.

## All Done page (20 October 2026)

**The "Yours to keep" section is centred.** It was built for three cards. Now
that the terms sit inside the agreement PDF there are two, and they were
sitting left of centre with a gap on the right. The block now sizes itself to
whatever is in it, so two cards centre and three still fill the row.

**The finish now hands over the client's own copies.** When someone completes
onboarding, the signed agreement and their onboarding answers are passed
straight through, ready to be emailed to them. They are the same two files the
All Done screen offers, so the email and the screen can never give out
different versions.

## Payment page and onboarding (20 October 2026)

**The line telling them to authorise the payment is gone.** Trying to save
without ticking the box used to put a red "Please confirm you authorise the
payments" underneath it. The Save button is simply greyed out until the box is
ticked, so there is nothing to tell them off about. Every other check still
speaks up as it did, such as a missing account name or a short BSB.

**The note at the bottom no longer mentions card details.** The portal only
collects a bank account, so it now reads "Your bank details are encrypted
before they are stored. Nothing is charged today." It used to open with card
details being held by Pinch Payments, left over from when a card was an
option.

**The onboarding shortcut reads "Same as above".** On the Primary Contact
section it used to say "Same as the director above". Ticking it still copies
the director's first name, last name and email down.

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
