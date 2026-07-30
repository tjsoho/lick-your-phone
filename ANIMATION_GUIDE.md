# Smooth Upward Animation Guide

This guide documents the exact animation pattern used throughout the property form application. All animations use smooth upward motion with no horizontal movement.

## Core Animation Pattern

### Basic Structure

```tsx
import { motion } from "framer-motion";

<motion.div
  initial={{ opacity: 0, y: 30 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -30 }}
  transition={{ 
    duration: 0.6, 
    ease: [0.25, 0.1, 0.25, 1]
  }}
>
  {/* Your content */}
</motion.div>
```

### Key Principles

1. **Always animate upward**: Use `y` values (never `x` for horizontal movement)
2. **Smooth easing**: Use cubic-bezier `[0.25, 0.1, 0.25, 1]` instead of string easings
3. **No CSS transitions**: Remove `transition-all` classes that conflict with Framer Motion
4. **Performance**: Add `willChange: "transform, opacity"` for smooth animations

## Animation Values

### Entry Animation
- **Initial**: `{ opacity: 0, y: 30 }` - Starts invisible, 30px below final position
- **Animate**: `{ opacity: 1, y: 0 }` - Fades in and moves to final position
- **Duration**: `0.6` seconds
- **Easing**: `[0.25, 0.1, 0.25, 1]` (smooth cubic-bezier)

### Exit Animation
- **Exit**: `{ opacity: 0, y: -30 }` - Fades out and moves 30px up
- **Duration**: `0.6` seconds
- **Easing**: `[0.25, 0.1, 0.25, 1]`

### For Larger Elements (Full Sections)
- **Initial**: `{ opacity: 0, y: 50 }` - More distance for bigger impact
- **Exit**: `{ opacity: 0, y: -50 }`

## Staggered Animations (Multiple Elements)

When animating multiple elements in sequence, use staggered delays:

```tsx
{elements.map((element, index) => (
  <motion.div
    key={element.id}
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ 
      duration: 0.6, 
      ease: [0.25, 0.1, 0.25, 1],
      delay: index * 0.1  // 0.1s delay between each element
    }}
  >
    {element.content}
  </motion.div>
))}
```

### Staggered Pattern Examples

**Quick succession (0.05s delay):**
```tsx
delay: index * 0.05
```

**Standard (0.1s delay):**
```tsx
delay: index * 0.1
```

**Slower (0.15s delay):**
```tsx
delay: index * 0.15
```

**With base delay:**
```tsx
delay: 0.2 + index * 0.1  // Starts at 0.2s, then 0.1s between each
```

## Answer Options / Box Elements

For answer options, radio buttons, checkboxes, or selectable boxes:

```tsx
{options.map((option, index) => (
  <motion.label
    key={option.value}
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ 
      duration: 0.6, 
      ease: [0.25, 0.1, 0.25, 1],
      delay: index * 0.1 
    }}
    style={{
      willChange: "transform, opacity",  // Performance optimization
    }}
    className="w-full p-4 border-2 flex items-center gap-3"
  >
    {/* Option content */}
  </motion.label>
))}
```

### Important Notes for Answer Boxes

1. **Remove CSS transitions**: Don't use `transition-all duration-200` classes
2. **Add willChange**: Helps browser optimize animations
3. **Consistent delay**: Use `index * 0.1` for smooth cascading effect
4. **No horizontal movement**: Only use `y` values, never `x`

## Complete Example: Form Section with Multiple Elements

```tsx
"use client";

import { motion } from "framer-motion";

export default function AnimatedFormSection() {
  const options = [
    { value: "option1", label: "Option 1" },
    { value: "option2", label: "Option 2" },
    { value: "option3", label: "Option 3" },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      className="w-full max-w-lg mx-auto px-4 py-20"
    >
      {/* Title - First element */}
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}
        className="text-center mb-4"
      >
        Form Title
      </motion.h1>

      {/* Subtitle - Second element */}
      <motion.p
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
        className="text-center mb-8"
      >
        Form subtitle text
      </motion.p>

      {/* Answer Options - Staggered */}
      <div className="space-y-3">
        {options.map((option, index) => (
          <motion.label
            key={option.value}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.6, 
              ease: [0.25, 0.1, 0.25, 1],
              delay: 0.3 + index * 0.1  // Start after subtitle, then stagger
            }}
            style={{
              willChange: "transform, opacity",
            }}
            className="w-full p-4 border-2 flex items-center gap-3"
          >
            <input type="radio" name="options" value={option.value} />
            <span>{option.label}</span>
          </motion.label>
        ))}
      </div>

      {/* Buttons - Last elements */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 0.6 }}
        className="flex gap-4 mt-8"
      >
        <button>Previous</button>
        <button>Continue</button>
      </motion.div>
    </motion.section>
  );
}
```

## Using with AnimatePresence

For page transitions or conditional rendering:

```tsx
import { AnimatePresence } from "framer-motion";

<AnimatePresence mode="wait">
  {currentStep === 1 && (
    <motion.div
      key="step-1"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
    >
      Step 1 Content
    </motion.div>
  )}
  
  {currentStep === 2 && (
    <motion.div
      key="step-2"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
    >
      Step 2 Content
    </motion.div>
  )}
</AnimatePresence>
```

## Common Patterns

### Pattern 1: Single Element
```tsx
<motion.div
  initial={{ opacity: 0, y: 30 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
>
  Content
</motion.div>
```

### Pattern 2: Multiple Elements with Stagger
```tsx
{items.map((item, index) => (
  <motion.div
    key={item.id}
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ 
      duration: 0.6, 
      ease: [0.25, 0.1, 0.25, 1],
      delay: index * 0.1 
    }}
  >
    {item.content}
  </motion.div>
))}
```

### Pattern 3: Nested Animations (Parent + Children)
```tsx
{/* Parent container */}
<motion.div
  initial={{ opacity: 0, y: 50 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
>
  {/* Child elements with delays */}
  <motion.h1
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}
  >
    Title
  </motion.h1>
  
  <motion.p
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
  >
    Description
  </motion.p>
</motion.div>
```

## Performance Best Practices

1. **Use willChange**: Add `style={{ willChange: "transform, opacity" }}` to animated elements
2. **Remove conflicting CSS**: Don't use `transition-all` or `transition-*` classes on animated elements
3. **Optimize delays**: Keep delays reasonable (0.05s - 0.15s between elements)
4. **Use keys**: Always provide unique `key` props for mapped elements
5. **Avoid layout shifts**: Use fixed dimensions when possible to prevent reflows

## Troubleshooting

### Issue: Elements "jump" or "hop" at the end
**Solution**: 
- Remove CSS `transition-*` classes
- Use cubic-bezier easing `[0.25, 0.1, 0.25, 1]`
- Add `willChange: "transform, opacity"`

### Issue: Animations feel choppy
**Solution**:
- Check for conflicting CSS transitions
- Ensure `willChange` is set
- Reduce number of simultaneous animations
- Check browser performance

### Issue: Elements animate from the side
**Solution**:
- Never use `x` values in animations
- Only use `y` for vertical movement
- Check for any `translateX` in styles

### Issue: Exit animations not working
**Solution**:
- Wrap in `AnimatePresence` component
- Ensure `key` prop is set and changes when needed
- Add `exit` prop to motion elements

## Easing Function Reference

The cubic-bezier `[0.25, 0.1, 0.25, 1]` provides:
- Smooth acceleration at start
- Smooth deceleration at end
- No abrupt stops
- Natural feeling motion

This is equivalent to CSS `cubic-bezier(0.25, 0.1, 0.25, 1)`.

## Quick Reference

```tsx
// Single element
initial={{ opacity: 0, y: 30 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}

// With delay
transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}

// Staggered
transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: index * 0.1 }}

// Exit
exit={{ opacity: 0, y: -30 }}

// Performance
style={{ willChange: "transform, opacity" }}
```

## Example: Complete Form Step Component

```tsx
"use client";

import { motion } from "framer-motion";

interface Option {
  value: string;
  label: string;
}

interface FormStepProps {
  title: string;
  subtitle?: string;
  options: Option[];
  onSelect: (value: string) => void;
}

export default function FormStep({ title, subtitle, options, onSelect }: FormStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      className="w-full max-w-lg mx-auto px-4 py-20"
    >
      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}
        className="text-center mb-4"
      >
        {title}
      </motion.h1>

      {/* Subtitle */}
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
          className="text-center mb-8"
        >
          {subtitle}
        </motion.p>
      )}

      {/* Options */}
      <div className="space-y-3">
        {options.map((option, index) => (
          <motion.button
            key={option.value}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.6, 
              ease: [0.25, 0.1, 0.25, 1],
              delay: 0.3 + index * 0.1 
            }}
            style={{
              willChange: "transform, opacity",
            }}
            onClick={() => onSelect(option.value)}
            className="w-full p-4 border-2 text-left"
          >
            {option.label}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
```

---

**Remember**: Always use `y` values (vertical), never `x` (horizontal). Keep animations smooth, consistent, and performant!



