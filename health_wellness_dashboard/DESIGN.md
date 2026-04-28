---
name: Health & Wellness Dashboard
colors:
  surface: '#f7f9ff'
  surface-dim: '#c9dcf3'
  surface-bright: '#f7f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#edf4ff'
  surface-container: '#e3efff'
  surface-container-high: '#d9eaff'
  surface-container-highest: '#d1e4fb'
  on-surface: '#091d2e'
  on-surface-variant: '#3d4a3e'
  inverse-surface: '#203243'
  inverse-on-surface: '#e8f2ff'
  outline: '#6c7b6d'
  outline-variant: '#bbcbbb'
  surface-tint: '#006d37'
  primary: '#006d37'
  on-primary: '#ffffff'
  primary-container: '#2ecc71'
  on-primary-container: '#005027'
  inverse-primary: '#4ae183'
  secondary: '#006397'
  on-secondary: '#ffffff'
  secondary-container: '#5cb8fd'
  on-secondary-container: '#00476e'
  tertiary: '#865300'
  on-tertiary: '#ffffff'
  tertiary-container: '#f8a018'
  on-tertiary-container: '#633c00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#6bfe9c'
  primary-fixed-dim: '#4ae183'
  on-primary-fixed: '#00210c'
  on-primary-fixed-variant: '#005228'
  secondary-fixed: '#cce5ff'
  secondary-fixed-dim: '#92ccff'
  on-secondary-fixed: '#001d31'
  on-secondary-fixed-variant: '#004b73'
  tertiary-fixed: '#ffddb9'
  tertiary-fixed-dim: '#ffb961'
  on-tertiary-fixed: '#2b1700'
  on-tertiary-fixed-variant: '#663e00'
  background: '#f7f9ff'
  on-background: '#091d2e'
  surface-variant: '#d1e4fb'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  data-metric:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 24px
  margin-container: 32px
---

## Brand & Style
The design system is engineered to evoke a sense of clinical precision tempered by human warmth. The brand personality is professional, proactive, and encouraging, positioning the product as a reliable partner in a user’s health journey. 

The aesthetic follows a **Corporate / Modern** style with a focus on data clarity. It utilizes a spacious, card-based interface to de-clutter complex physiological data, ensuring that critical health metrics are the primary focus. The visual language is defined by soft edges and high-clarity layouts to reduce cognitive load and foster a sense of calm and control.

## Colors
The palette is rooted in functional color theory to assist in rapid data visualization. 
- **Health Green (#2ECC71)**: Used for "Normal" ranges, positive trends, and primary action buttons to signal safety and progress.
- **Calm Blue (#3498DB)**: Utilized for informational components, deep-dive data views, and secondary actions to instill a sense of stability.
- **Vitality Orange (#F39C12)**: Reserved for "Caution" states, pending goals, or moderate-intensity activity metrics.
- **Neutrals**: A range of cool grays (from #F8FAFC backgrounds to #2C3E50 text) ensures high contrast and accessibility while maintaining a professional, sterile-yet-inviting environment.

## Typography
This design system employs a dual-font strategy. **Manrope** is used for headlines to provide a modern, refined, and trustworthy character. **Inter** is used for all body copy, data labels, and metrics due to its exceptional legibility at small sizes and high x-height, which is critical for reading charts and health logs. 

Hierarchy is established through weight and color contrast rather than just size. Important health metrics should use the "data-metric" style for immediate scanning.

## Layout & Spacing
The layout utilizes a **fixed-width grid** for desktop dashboards to ensure data visualizations do not become overly distorted on ultra-wide screens. A 12-column system is used with generous 24px gutters to allow the health cards "room to breathe." 

The spacing rhythm is based on an 8px baseline grid. Content within cards should typically use "md" (24px) padding to maintain an airy, approachable feel that prevents the information from feeling overwhelming or cluttered.

## Elevation & Depth
Depth is created using **ambient shadows** and tonal layering. This design system avoids heavy borders in favor of soft, diffused shadows that lift cards off the subtle gray background. 

- **Level 0 (Background):** #F8FAFC.
- **Level 1 (Cards):** White surface with a 15% opacity shadow, 20px blur, and 4px vertical offset.
- **Level 2 (Interactive/Hover):** Increase shadow opacity to 20% and blur to 30px to indicate "lift" upon interaction.
- **Level 3 (Modals/Popovers):** High-contrast shadow to focus attention on critical health inputs or alerts.

## Shapes
The shape language is consistently **Rounded**. This softens the "clinical" nature of health data, making the experience feel more personal and less institutional. 

Standard components (buttons, input fields) use a 0.5rem (8px) radius. Larger containers and dashboard cards use a 1rem (16px) radius to emphasize the card-based architecture. Progress bars and status chips should use a fully rounded (pill) style to signify fluidity and movement.

## Components
- **Buttons:** Primary buttons use a solid 'Health Green' fill with white text. Secondary buttons use a 'Calm Blue' outline. All buttons have a height of 48px for easy touch targets.
- **Cards:** The primary container for data. Each card must have a 16px corner radius, a white background, and a 24px internal padding.
- **Chips:** Small, pill-shaped indicators for "Category" (e.g., Sleep, Nutrition). Use a light tint of the category's signature color (10% opacity) with high-contrast text.
- **Input Fields:** Minimalist style with a 1px soft gray border (#E2E8F0) that transitions to 'Calm Blue' on focus.
- **Data Visualizations:** Charts should use the primary and secondary colors. Use thick strokes for line charts (3px) and rounded caps on bar charts to match the overall shape language.
- **Health Indicators:** A specific component featuring a large "Data-Metric" value, an icon, and a trend arrow (up/down) to provide instant status updates.