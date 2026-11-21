---
name: mobile-chat-scroll-engineering
description: Build flawless mobile and desktop chat scrolling, sticky composer anchoring, visualViewport synchronization, and virtual keyboard handling across iOS Safari, Android Chrome, and responsive webviews.
---

# mobile-chat-scroll-engineering

## 1. Purpose

Define engineering patterns and CSS/JavaScript standards for mobile chat interfaces. Ensure that message scrolling, composer positioning, auto-scrolling during streaming, and virtual keyboard appearances perform smoothly without layout jitter, viewport clipping, or messages being obscured behind the keyboard or composer.

## 2. When to Use

- Developing or fixing mobile chat sheets, floating consultation panels, or full-screen messenger views.
- Debugging iOS Safari virtual keyboard expansion where the input field is pushed offscreen or covered.
- Fixing double scrollbars, accidental body scrolling, or rubber-banding on touch devices.
- Implementing auto-scroll anchoring that tracks streaming AI tokens while respecting user scroll gestures.
- Ensuring composer inputs maintain adequate physical touch targets and prevent iOS auto-zoom ($\ge 16\text{px}$ font).

## 3. Scope

- Viewport unit ergonomics: `100dvh` vs. `100vh` vs. `window.innerHeight`.
- Dynamic `window.visualViewport` API integration for keyboard height tracking.
- Touch scroll isolation using `overscroll-behavior: contain` and dedicated flexbox scroll containers.
- Safe area inset handling (`env(safe-area-inset-bottom)`).
- Scroll anchoring algorithms (auto-scroll down when near bottom, stay pinned when reading history).
- Floating "Jump to Latest" (Scroll-to-bottom) button state and positioning.

## 4. Required Inputs

- HTML container structure:
  - Header (`.ai-sheet-header`): Fixed compact height ($50\text{px}–56\text{px}$).
  - Message Scroll Area (`.ai-messages-container`): Flex item with `overflow-y: auto`.
  - Composer Area (`.ai-composer-wrapper`): Fixed/sticky at bottom with dynamic padding.
- `window.visualViewport` events (`resize`, `scroll`).
- Active device media queries ($\le 680\text{px}$ for mobile sheet).

## 5. Technical Workflow

```mermaid
flowchart TD
    A[Mobile Chat Open] --> B[Set Container Height to 100dvh]
    B --> C[Attach visualViewport Listener]
    C --> D{Virtual Keyboard Opens?}
    D -->|Yes| E[Compute keyboardHeight = window.innerHeight - vv.height]
    E --> F[Adjust composer bottom offset / padding flush to keyboard]
    F --> G[Scroll active message container to bottom smoothly]
    D -->|No| H[Maintain env(safe-area-inset-bottom) baseline]
    I[User Scrolls Up] --> J[Disable Auto-Scroll & Show Jump-To-Bottom Pill]
    K[Streaming Tokens Arrive] --> L{Was User Scrolled to Bottom?}
    L -->|Yes| M[Auto-scroll to follow latest token]
    L -->|No| N[Keep scroll position stable]
```

1. **Container Layout Structure**:
   ```css
   .ai-sheet {
     display: flex;
     flex-direction: column;
     height: 100dvh;
     max-height: 100dvh;
     position: fixed;
     inset: 0;
     z-index: 99999;
     background: var(--bg-surface);
   }
   .ai-messages-container {
     flex: 1 1 0%;
     overflow-y: auto;
     -webkit-overflow-scrolling: touch;
     overscroll-behavior: contain;
     padding: 12px 14px 16px 14px;
   }
   .ai-composer-wrapper {
     flex-shrink: 0;
     background: var(--bg-surface-elevated);
     padding-bottom: max(10px, env(safe-area-inset-bottom));
     border-top: 1px solid var(--border-subtle);
   }
   ```
2. **VisualViewport Virtual Keyboard Handling**:
   ```javascript
   if (window.visualViewport) {
     const handleResize = () => {
       const vv = window.visualViewport;
       const offsetFromBottom = window.innerHeight - (vv.height + vv.offsetTop);
       composerEl.style.transform =
         offsetFromBottom > 0 ? `translateY(-${offsetFromBottom}px)` : "none";
       if (isUserNearBottom()) {
         scrollToBottom(false);
       }
     };
     window.visualViewport.addEventListener("resize", handleResize);
     window.visualViewport.addEventListener("scroll", handleResize);
   }
   ```
3. **Scroll Anchoring Logic**:
   - Calculate distance from bottom: `dist = container.scrollHeight - container.scrollTop - container.clientHeight`.
   - If `dist < 60px`: seeker is at bottom $\implies$ auto-scroll on new incoming tokens.
   - If `dist >= 60px`: seeker has scrolled up to read earlier text $\implies$ do not jump down; display the floating "↓ New Messages" button.
4. **Input Zoom Prevention**: Set `font-size: 16px !important` on all mobile text inputs and textareas to prevent iOS Safari from automatically zooming the page on focus.

## 6. Domain-Specific Rules

- **Composer Touch Targets**: The message input must span $\ge 220\text{px}$ in width on mobile screens ($\ge 320\text{px}$ viewport), with the send button constrained to under $90\text{px}$ width.
- **Header Compactness**: On mobile devices ($\le 680\text{px}$), the chat header must not exceed $56\text{px}$ in height to maximize visible reading space.
- **Zero Full-Page Scroll Leakage**: The underlying `<body>` must have `overflow: hidden` while the mobile chat sheet is active.
- **Draft Preservation**: Never clear or lose the seeker's typed input draft if an orientation change or viewport resize occurs.

## 7. Integration Requirements

- Implemented in `index.html` within the `#ai-astrologer-sheet` and `#ai-chat-messages` elements.
- Verified using headless Chrome and WebKit mobile emulation scripts.
- Integrates with `streaming-and-retry-reliability` to anchor incoming SSE token batches.

## 8. Failure Handling

- **Unsupported VisualViewport API**: Fall back to CSS `position: sticky; bottom: 0` with `100vh` and standard safe-area padding.
- **Stuck Scroll Locks**: When the chat modal is dismissed, ensure `document.body.style.overflow = ''` is cleanly restored.
- **Extreme Message Heights**: Format long planetary readings with collapsible sections or legible paragraph breaks so the user can easily navigate the text.

## 9. Security Considerations

- Sanitize rendered HTML inside messages to prevent DOM XSS vulnerabilities when inserting markdown or rich cards.
- Ensure overlay elements do not intercept click events destined for the underlying text or controls.

## 10. Testing Methodology

- Automated bounding box audit via Playwright/Puppeteer script across:
  - iPhone 13 ($390 \times 844$, DPR 3)
  - iPhone SE ($375 \times 667$, DPR 2)
  - Android Pixel 5 ($393 \times 851$, DPR 2.75)
- Automated keyboard simulation with 500px simulated viewport reduction.
- Test script: `scripts/verify_mobile_chat_dimensions.mjs`.

## 11. Acceptance Checklist

- [ ] Message scroll area occupies full remaining height between compact header and composer.
- [ ] Composer input field is $\ge 220\text{px}$ wide on narrow mobile viewports ($375\text{px}$).
- [ ] Input font size is $\ge 16\text{px}$ (prevents iOS auto-zoom).
- [ ] Virtual keyboard opening keeps composer visible and flush above keyboard.
- [ ] Auto-scroll smoothly follows incoming streaming tokens without flickering.
- [ ] Scrolling up disables auto-scroll and surfaces the "Jump to Latest" control.

## 12. Clear Prohibited Behaviours

- NEVER allow messages to be hidden behind the bottom composer.
- NEVER allow the mobile header to exceed $60\text{px}$ height on small screens.
- NEVER allow background page body scrolling while the mobile chat sheet is open.
- NEVER clear unsent user input during orientation changes or keyboard dismissals.

## 13. References to Relevant AstroVerse Architecture

- Sheet Markup & CSS: `index.html` (`#ai-astrologer-sheet`, `.ai-composer-wrapper`).
- Verification Script: `scripts/verify_mobile_chat_dimensions.mjs`.
- Related Skills: `conversational-ai-engineering`, `playwright-webkit-qa`, `streaming-and-retry-reliability`.
