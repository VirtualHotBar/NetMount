/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/*.{js,ts,jsx,tsx}", // 如果你的项目使用的是 TypeScript，确保包括 tsx 文件
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

