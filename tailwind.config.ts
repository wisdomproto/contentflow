import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        'card-foreground': 'var(--card-foreground)',
        border: 'var(--border)',
        input: 'var(--input)',
        'input-border': 'var(--input-border)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        accent: 'var(--accent)',
        'accent-foreground': 'var(--accent-foreground)',
        destructive: 'var(--destructive)',
        ring: 'var(--ring)',
      },
      fontFamily: {
        sans: [
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Roboto',
          '"Noto Sans KR"',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      width: {
        sidebar: '280px',
        'right-panel': '320px',
      },
      minWidth: {
        sidebar: '220px',
        'right-panel': '280px',
      },
      maxWidth: {
        sidebar: '400px',
        'right-panel': '480px',
      },
    },
  },
  plugins: [],
};
export default config;
