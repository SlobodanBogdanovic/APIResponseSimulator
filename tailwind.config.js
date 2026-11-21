export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F4F7F8',
        panel: '#FFFFFF',
        ink: '#14202E',
        secondary: '#3E4C5A',
        line: '#6B7C8C',
        signal: '#0B5F4E',
        'signal-press': '#084A3D',
        idle: '#6E7C8A',
        danger: '#9B2330',
        'danger-press': '#7A1B26',
        'hover-panel': '#E6EEEB',
        'method-get': '#146C43',
        'method-post': '#1D4E89',
        'method-put': '#8A5A00',
        'method-delete': '#9B2330',
        'method-patch': '#5B3A8C',
        'method-any': '#3E4C5A',
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        title: ['20px', { lineHeight: '28px' }],
        ui: ['14px', { lineHeight: '20px' }],
        meta: ['12px', { lineHeight: '16px' }],
      },
    },
  },
  plugins: [],
}
