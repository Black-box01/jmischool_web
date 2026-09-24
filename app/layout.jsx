import "./globals.css";
import "react-toastify/dist/ReactToastify.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export const metadata = {
  title: "JMIS School — Jeshurun Montessori International School",
  description:
    "Jeshurun Montessori International School — a nurturing, values-driven education from Creche to Secondary. Discover our programmes, facilities and admissions process.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
