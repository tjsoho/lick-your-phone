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

## Still open

**The block types and layouts.** You said choosing them is confusing, and you
are right, but the reason is worse than it looks and it is worth saying plainly.

**A page's layout is never chosen. It is worked out from which blocks happen to
be on the page.**

- Add a Client Results block and the whole page becomes the results slide.
- Images with no body copy and at most one line of text become a full-width
  showcase.
- Add a second paragraph to that page and it silently flips back to the
  two-column template.

So you add one element and the entire page changes shape, and nothing on screen
says it is going to. That is "I tried adding a couple of elements and it looks a
bit off".

There are three smaller things feeding the same confusion:

- **Image Position (left/right) does nothing on two of the three layouts**, and
  does not say so.
- **Offset Image draws nothing on its own.** It only appears if the page already
  has a featured image for it to sit over. Choosing it and seeing no change
  reads as broken.
- **Custom takes raw JSON.** That is a developer's escape hatch sitting in a
  client-facing dropdown.

The fix is to make layout a choice you make, in plain words, with the block list
then offering only what that layout uses. Waiting on your last two screenshots
before starting, so it is built against the page you were actually on.
