import type {Config} from 'tailwindcss';
export default {darkMode:'class',content:['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}'],theme:{extend:{fontFamily:{poppins:['var(--font-poppins)','sans-serif']},colors:{navy:'#1F2F3F',green:'#18A66A'}}},plugins:[]} satisfies Config;
