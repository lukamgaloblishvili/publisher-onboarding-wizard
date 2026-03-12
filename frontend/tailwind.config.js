/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        px: {
          green: "#299C61",
          deep: "#13743E",
          mist: "#E8F2EF",
          slate: "#D3DED8",
          ink: "#232323",
          cloud: "#F8F8F8",
          accent: "#CD62FF"
        }
      },
      boxShadow: {
        soft: "0 18px 40px rgba(19, 116, 62, 0.08)"
      },
      borderRadius: {
        xl2: "1.25rem",
        xl3: "1.75rem"
      }
    }
  },
  plugins: []
};
