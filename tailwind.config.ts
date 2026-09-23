import type { Config } from 'tailwindcss';

// MaskGuard design tokens — vivid glassmorphic redesign.
//
// Same token *names* as before so the rest of the app doesn't break, but
// repointed to a richer, more saturated system:
//   accent   — deep confident teal (#0EA5A0), the "safe / mask detected" color
//   accent2  — indigo-violet (#6D5EF0), paired with accent for the signature gradient
//   alert    — warm coral (#E8735C), semantic-only, never decorative
//   base     — light violet-tinted neutral so glass panels have something to sit on
//   surface  — white at low opacity, used for glass fills
//   ink      — near-charcoal for body copy (legibility over vibrancy)
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#F1F0FB',
        surface: '#FFFFFF',
        ink: '#1F2430',
        inkmuted: '#5B6472',
        line: '#E4E7EC',
        accent: {
          DEFAULT: '#0EA5A0',
          soft: '#CFEFEC',
          deep: '#0B7E7C',
        },
        accent2: {
          DEFAULT: '#6D5EF0',
          soft: '#E1DEFC',
          deep: '#5142C4',
        },
        alert: {
          DEFAULT: '#E8735C',
          soft: '#FBE0D9',
          deep: '#C4573F',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        body: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      backdropBlur: {
        glass: '24px',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(31, 24, 72, 0.12), 0 2px 8px rgba(31, 24, 72, 0.06)',
        glow: '0 0 32px rgba(109, 94, 240, 0.35)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      backgroundImage: {
        // Signature gradient — reuse this token so we don't invent new gradient
        // stops per section. Used on the primary CTA, gradient text on hero
        // headline, gradient icon badges on the about page, etc.
        'brand-gradient': 'linear-gradient(135deg, #0EA5A0 0%, #6D5EF0 100%)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s linear infinite',
        pulseSoft: 'pulseSoft 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
