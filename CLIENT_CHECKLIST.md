# Eight changes, and how to test each one

All live. Each test takes under a minute.

---

### 1. Subheading blocks save

Subheading was in the list but the database rejected it every time.

**Test:** Content Pages → open any page → Add Block → Subheading → type → Add.
It saves and shows in the preview.

---

### 2. Drag content blocks by the dots

The dots on the left were decoration. Only the arrows worked.

**Test:** Content Pages → open a page with 3+ blocks → drag the bottom one to
the top by its dots → reload. It stayed.

---

### 3. Content page Order numbers

Typing 19 made a second page 19 instead of pushing others down. The box is
gone. Order is by dragging, and the number shows the real position.

**Test:** Content Pages → Add Page. There is no Order box. It lands at the
bottom. Drag it up and the numbers stay correct.

---

### 4. Add a page to the onboarding form

You could not make a page, only land on one by adding a question.

**Test:** Onboarding Questions → bottom → Add page. Click its heading to name
it. Delete it with the bin in its header. Only empty pages can be deleted.

---

### 5. Drag a question to another page

Sofia's one. The old drag tool could not move anything between pages at all.

**Test:** Onboarding Questions → drag a question from one page onto another →
reload. It stayed, on the new page, in the section you dropped it into.

You can also drag a section heading to move the whole section, and drag a page
by the grip beside its name.

---

### 6. See a question as you write it

**Test:** Onboarding Questions → Add question. Type into Section, Section
Subtitle and Field Label. The right-hand panel shows it as the client sees it.
Change Field Type and the control changes.

---

### 7. Preview the whole form, no proposal needed

**Test:** Onboarding Questions → Preview form (top right). Press Continue
through all six pages without filling anything in. Nothing is saved.

It shows every question, including ones only some clients get, and tells you
what would have stopped a real client.

---

### 8. You pick the page layout now

The layout was never chosen. It was worked out from whichever blocks were on
the page, so adding one element could change the whole page with no warning.

**Test:** Content Pages → Our Promise. The Layout card says it is working the
layout out from the page. Click Showcase. The preview changes, and it tells you
the List block will not show. Click Text and image to put it back.

Four layouts: Text and image, Showcase, Client results, Statement. Each lists
the blocks it draws. The card also warns when a block is being ignored, and
says when Image Position does nothing.

On a page with a service attached the shape is fixed, and it says so.

Nothing you have already built has changed. Every page keeps its current shape
until someone picks.

---

**Also:** the Custom block type is gone from the list. It took raw code and was
never meant for you.

**Note:** the live site can take a few seconds to catch up after Add page. The
page is saved straight away even if the screen lags.
