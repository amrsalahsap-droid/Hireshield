/**
 * Clerk appearance variables aligned with the app design system (globals.css).
 * Use for ClerkProvider and SignIn/SignUp so auth UI matches the rest of the app.
 */

export const clerkVariables = {
  // Colors (HSL from design tokens)
  colorPrimary: "hsl(222, 60%, 18%)",
  colorPrimaryForeground: "hsl(210, 40%, 98%)",
  colorBackground: "hsl(220, 20%, 97%)",
  colorForeground: "hsl(222, 47%, 11%)",
  colorMuted: "hsl(220, 14%, 95%)",
  colorMutedForeground: "hsl(220, 9%, 46%)",
  colorInput: "hsl(220, 13%, 91%)",
  colorInputForeground: "hsl(222, 47%, 11%)",
  colorBorder: "hsl(220, 13%, 91%)",
  colorRing: "hsl(222, 60%, 18%)",
  colorDanger: "hsl(0, 72%, 51%)",
  colorSuccess: "hsl(162, 63%, 41%)",
  colorWarning: "hsl(38, 92%, 50%)",
  // Typography (matches font-body)
  fontFamily: "Inter, sans-serif",
  fontFamilyButtons: "Inter, sans-serif",
  // Layout
  borderRadius: "0.75rem",
} as const;

export const clerkAppearance = {
  variables: clerkVariables,
} as const;
