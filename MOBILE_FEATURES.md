# Mobile Features Guide

## 📱 Mobile Navigation

### Bottom Navigation Bar (Mobile Only)
On screens smaller than 768px (md breakpoint), a fixed bottom navigation bar appears with 4 main sections:

```
┌─────────────────────────────────────┐
│                                     │
│         Main Content Area           │
│                                     │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  📊      🌍      ☰      💬          │
│ Stocks  Markets Filter  AI Chat     │
└─────────────────────────────────────┘
```

### Hamburger Menu (Mobile Only)
- Located in the top-left corner
- Opens/closes the sidebar filter panel
- Transforms to X icon when open

### Mobile AI Chat Button (Mobile Only)
- Located in the top-right corner
- Opens AI chat as a full-screen overlay
- Includes close button in chat header

## 🎨 Responsive Layouts

### Header
**Desktop:**
```
┌────────────────────────────────────────────────────────────┐
│ [Logo] StockSense PRO  [Stats] [Stats] [Stats]  [Nav] [🔴] │
└────────────────────────────────────────────────────────────┘
```

**Mobile:**
```
┌──────────────────────────────────┐
│ [☰] [Logo] StockSense PRO  [💬]  │
└──────────────────────────────────┘
```

### Main Layout
**Desktop (≥1024px):**
```
┌──────────┬────────────────────┬──────────┐
│          │                    │          │
│ Sidebar  │   Main Content     │ AI Chat  │
│ (Fixed)  │   (Scrollable)     │ (Fixed)  │
│          │                    │          │
└──────────┴────────────────────┴──────────┘
```

**Mobile (<1024px):**
```
┌────────────────────────────────┐
│                                │
│      Main Content              │
│      (Full Width)              │
│                                │
└────────────────────────────────┘
┌────────────────────────────────┐
│  Bottom Navigation Bar         │
└────────────────────────────────┘

[Sidebar slides in from left when opened]
[AI Chat slides in from right when opened]
```

### Stock Grid
**Desktop (≥1280px):** 4 columns
**Laptop (≥1024px):** 3 columns
**Tablet (≥640px):** 2 columns
**Mobile (<640px):** 1 column

### Stock Detail Modal
**Desktop:**
```
┌─────────────────────────────────────────┐
│ [Symbol] [Exchange] [Currency]    [★][X]│
│ $123.45  +2.34%  (+$2.34) today         │
│ 52W High | 52W Low | Mkt Cap | Volume   │
├─────────────────────────────────────────┤
│ [Chart] [Fundamentals] [News]           │
├─────────────────────────────────────────┤
│                                         │
│         Content Area                    │
│                                         │
└─────────────────────────────────────────┘
```

**Mobile:**
```
┌───────────────────────────┐
│ [Symbol] [Exch] [Cur][★][X]│
│ $123.45                   │
│ +2.34% (+$2.34) today     │
│ ← 52W High | 52W Low → ⟶  │
├───────────────────────────┤
│ ← Chart | Fund | News → ⟶ │
├───────────────────────────┤
│                           │
│    Content Area           │
│    (Scrollable)           │
│                           │
└───────────────────────────┘
```

## 🎯 Touch Targets

All interactive elements meet WCAG 2.1 Level AAA guidelines:
- Minimum touch target: **44px × 44px**
- Buttons, links, and interactive elements are sized appropriately
- Adequate spacing between touch targets

## 📐 Responsive Breakpoints

### Text Sizes
```
Element          Mobile    Tablet    Desktop
─────────────────────────────────────────────
H1 Heading       text-xs   text-sm   text-sm
Body Text        text-[9px] text-[10px] text-[10px]
Ticker Symbol    text-[10px] text-xs   text-xs
Modal Title      text-lg   text-xl   text-xl
Button Text      text-[9px] text-xs   text-xs
```

### Spacing
```
Element          Mobile    Tablet    Desktop
─────────────────────────────────────────────
Container Padding p-2      p-3       p-4
Card Padding     p-3      p-4       p-4
Modal Padding    p-3      p-5       p-5
Gap Between      gap-1    gap-2     gap-3
```

## 🔄 Animations & Transitions

### Slide-in Panels
- **Sidebar**: Slides from left with `transform: translateX(-100%)` → `translateX(0)`
- **AI Chat**: Slides from right with `transform: translateX(100%)` → `translateX(0)`
- **Duration**: 300ms with ease-in-out timing
- **Overlay**: Fades in/out with opacity transition

### Bottom Navigation
- **Position**: Fixed at bottom with `z-index: 30`
- **Safe Area**: Respects iOS home indicator with `padding-bottom: env(safe-area-inset-bottom)`

## 🍎 iOS-Specific Features

### Safe Area Support
```css
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

.safe-area-top {
  padding-top: env(safe-area-inset-top);
}
```

### Viewport Meta Tags
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, 
      maximum-scale=5.0, user-scalable=yes, viewport-fit=cover" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

### Momentum Scrolling
```css
.overflow-y-auto {
  -webkit-overflow-scrolling: touch;
}
```

## 🎨 Dark Theme Optimization

All colors are optimized for mobile OLED screens:
- **Background**: `#03060f` (Navy 950) - True black for OLED
- **Surface**: `#0d1b2e` (Surface 1) - Slightly elevated
- **Accent**: `#00d4ff` (Cyan) - High contrast for readability
- **Text**: `#e2e8f0` (Slate 200) - Comfortable reading

## 📊 Performance Optimizations

### Mobile-Specific
1. **Reduced Chart Height**: 200px on mobile vs 240px on desktop
2. **Lazy Loading**: Components load on demand
3. **Optimized Animations**: Hardware-accelerated transforms
4. **Efficient Scrolling**: Momentum scrolling on iOS
5. **Touch Optimization**: Prevents accidental interactions

### Bundle Size
- Main bundle: ~651KB (gzipped: ~186KB)
- CSS bundle: ~27KB (gzipped: ~6KB)
- Total initial load: ~192KB gzipped

## 🧪 Testing Checklist

### Mobile Devices
- [ ] iPhone 14 Pro (iOS 17+)
- [ ] iPhone SE (small screen)
- [ ] Samsung Galaxy S23 (Android)
- [ ] Google Pixel 7 (Android)
- [ ] iPad Air (tablet)

### Orientations
- [ ] Portrait mode
- [ ] Landscape mode
- [ ] Rotation transitions

### Interactions
- [ ] Tap buttons and links
- [ ] Swipe to scroll
- [ ] Pinch to zoom (should work)
- [ ] Pull to refresh (should be prevented)
- [ ] Bottom nav tap
- [ ] Sidebar slide-in/out
- [ ] AI chat slide-in/out
- [ ] Modal open/close

### Browsers
- [ ] Safari (iOS)
- [ ] Chrome (iOS)
- [ ] Chrome (Android)
- [ ] Samsung Internet
- [ ] Firefox (Android)

## 🚀 Deployment Status

### GitHub Pages
- **URL**: https://somnathkarforma.github.io/global-stock-market-app/
- **Auto-deploy**: Yes (on push to main)
- **Build time**: ~2-3 minutes

### Vercel
- **URL**: https://global-stock-market-app.vercel.app
- **Auto-deploy**: Yes (on push to main)
- **Build time**: ~1-2 minutes

## 📝 Notes

1. **Bottom Navigation**: Only visible on screens < 768px (md breakpoint)
2. **Sidebar Overlay**: Only on screens < 1024px (lg breakpoint)
3. **AI Chat Overlay**: Only on screens < 1024px (lg breakpoint)
4. **Touch Targets**: Automatically sized on mobile via CSS media query
5. **Safe Areas**: Automatically handled on iOS devices with notch/home indicator

## 🎯 Accessibility

- ✅ WCAG 2.1 Level AA compliant touch targets
- ✅ Proper ARIA labels on buttons
- ✅ Keyboard navigation support
- ✅ Screen reader friendly
- ✅ High contrast colors
- ✅ Scalable text (respects user font size preferences)
