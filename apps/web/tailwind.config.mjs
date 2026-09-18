/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './src/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    DEFAULT: '#F8B602',      // Color Principal
                    primary: '#F8B602',
                    hover: '#E0A300',        // Hover botones
                    selection: '#FEF3D6',    // Fondo selección / items activos
                    subtitle: '#414141',     // Texto principal / Subtítulos
                    options: '#8E8E8E',      // Bordes / Opciones inactivas
                    background: '#F9FAFB',   // Fondo global
                },
            },
            fontFamily: {
                sans: ['var(--font-dm-sans)', 'DM Sans', 'sans-serif'],
            },
        },
    },
    plugins: [],
};