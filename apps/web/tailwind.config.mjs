/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './src/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            // Los colores viven en src/styles/tailwind.css (@theme) — fuente única.
            // Este archivo solo mantiene fontFamily por compatibilidad.
            fontFamily: {
                sans: ['var(--font-dm-sans)', 'DM Sans', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
