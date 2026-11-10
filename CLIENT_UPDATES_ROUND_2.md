# What we changed, and how to check it

Seven things. Each one has a way to test it yourself in under a minute.

---

## [ ] 1. The Subheading block saves now

**What was wrong.** Subheading was in the list of block types and the proposal
already knew how to draw one, but the database had never been told the type
existed. So it threw "invalid input value for enum content_block_type" and
refused every save.

**Test it.** Content Pages, open any page, Content Blocks, Add Block, choose
Subheading, type something, Add. It saves, and it appears in the live preview
on the right.

---

## [ ] 2. Drag content blocks by the dots on the left

**What was wrong.** The dots were decoration. They looked like a drag handle
and did nothing, so the arrows were the only way to move a block.

**What it does now.** Drag the dots to move a block anywhere in the list. The
arrows still work, because they are the obvious way to nudge something one
place, and a drag handle tells nobody that it also takes the keyboard.

**Also fixed while we were there.** The arrows used to renumber every block on
screen but only ever save two of them. On a page whose numbering had drifted,
the rest was quietly thrown away. Every block that moves is now saved, and a
failed save says so instead of going silent.

**Test it.** Content Pages, open a page with three or more blocks. Drag the
bottom one to the top by its dots. Reload the page. It stayed.

---

## [ ] 3. The Order numbers on Content Pages

**What was wrong.** Typing 19 into a new page's Order box did not push anything
down, it just made a second page numbered 19. Dragging rows already reordered
them properly, so the typed number was a second way of doing the same job that
only ever got it wrong.

**What it does now.** The box is gone. A new page goes on the end, and you move
it where you want by dragging. The Order column shows where the row actually
sits, so it always reads 1 upwards with no duplicates and no gaps.

**Your two 19s have already gone.** Something was dragged after that
screenshot, which renumbered everything. That is the proof, really: the number
was only ever wrong at the moment a page was created, which is the box that has
now been removed.

**Test it.** Content Pages, Add Page. There is no Order box. Add it, and it
lands at the bottom. Drag it up the list and watch the numbers stay correct.

---

## [ ] 4. Add a page to the onboarding form

**What was wrong.** A page only existed because a question sat on it. There was
no way to make a page and then fill it.

**What it does now.** Add page at the bottom of Onboarding Questions makes an
empty one. Name it by clicking its heading. An empty page can be deleted with
the bin icon in its header. A page with questions on it cannot, so nothing can
take your questions with it by accident.

**Test it.** Onboarding Questions, scroll to the bottom, Add page. Name it. Then
delete it with the bin in its header.

---

## [ ] 5. Drag a question from one page to another

**This is Sofia's one.** It was not a missing setting, it was the drag library.
The one in use cannot move an item between two groups at all, so no amount of
adjusting would have done it. That screen has been rebuilt on one that can.

**What it does now.**

- Drag a question by its grip to move it inside its section.
- Drag a section heading to move the whole section and everything in it.
- Drag a page by the grip beside its name.
- **Drag a question onto a different page.** It takes the section it lands in,
  so it never turns up under a heading that means nothing there. Drop it on an
  empty page and it starts that page off.

The grip now leads every row, so the question grips, section grips and page
grips all stand in one line down the left.

**Test it.** Onboarding Questions. Drag a question from the bottom of one page
onto the middle of another. Reload. It stayed, on the new page, in the section
you dropped it into.

---

## [ ] 6. See a question as you write it

**What was wrong.** "I struggled a bit to picture what these would look like
just by the names."

**What it does now.** Adding or editing a question is two columns. The form on
the left, and on the right the question drawn exactly as the client will see
it, updating as you type. Section heading, section subtitle, field label, the
required marker and the real control for whichever field type is chosen.

**Test it.** Onboarding Questions, Add question. Type into Section, Section
Subtitle and Field Label and watch the right-hand panel. Change Field Type and
watch the control change.

---

## [ ] 7. Preview the whole form, with no proposal

**What was wrong.** "In order to see my new question I had to test it."

**What it does now.** Preview form, top right of Onboarding Questions. It runs
the real client form on the real questions, page by page. No proposal needed,
nothing is saved, and Submit does nothing.

Two deliberate choices worth knowing:

- **Every question shows,** including the ones only some clients get. A preview
  with an empty basket would hide the very question you just wrote.
- **It does not stop at required questions.** Filling in every required field on
  every page to reach the next one is exactly what this is meant to save you
  from. The page turns, and a note tells you what a client would have been
  stopped by, which is the useful part.

**Test it.** Onboarding Questions, Preview form. Press Continue through all six
pages without filling anything in.

---

## [ ] 8. You pick the layout now, it is not guessed

**What was wrong, and it is worse than it looked.** A page's layout was never
chosen. It was worked out from whichever blocks happened to be on it.

- Add a Client Results block and the whole page became the results slide.
- Images with almost no words became a full-width showcase.
- Add a second paragraph and it silently turned back into the two-column page.

So you added one element and the shape of the whole page changed, with nothing
on screen saying it would. That is "I tried adding a couple of elements and it
looks a bit off".

**Your two screenshots show exactly this.** The page looks completely different
between them because a service got attached in between, and a page with a
service on it is drawn by a different template altogether. Nothing told you
that either.

**What it does now.** Every content page has a Layout card with four choices in
plain words:

- **Text and image.** Words down one side, a picture down the other.
- **Showcase.** Big imagery, at most one line of text.
- **Client results.** A grid of results, a phone mockup, a strip of logos.
- **Statement.** The title on its own.

Each one lists the blocks it actually draws. The card also:

- **names any block on the page that your chosen layout ignores,** so a block
  doing nothing can never be a mystery again
- **says when Image Position does nothing.** That left and right setting was
  already being ignored on two layouts out of three, silently
- **says when a page is on a service**, where the shape is fixed, and lists what
  shows on it rather than offering four choices that would do nothing

**Custom is gone from the list of block types.** It took raw code and was never
meant for you. Any page already using one still works.

**Nothing you have already built has moved.** Every existing page keeps the
shape it has today until somebody actually picks something. The old rules still
run as the fallback, and the card tells you when that is what is happening.

**Test it.** Content Pages, open Our Promise. The Layout card says it is working
the layout out from the page, and Text and image is selected. Click Showcase and
watch the preview change, and watch it tell you the List block will not show.
Click Text and image to put it back.

---

## Still open

**Nothing from your list.** All eight are done.

One thing we chose not to do this round, so you know it was a decision and not
an oversight: on a page with only a few blocks the words sit low and detached
from the title, with a gap above them, and body copy is quite small for a
slide. That is a design change affecting every content page, so it is worth
looking at together rather than slipping it in beside everything else.
