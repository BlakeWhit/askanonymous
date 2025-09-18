import "./globals.css";

export const metadata = {
  title: "AskAnon - Anonymous Q&A with FHEVM",
  description: "A secure, privacy-preserving anonymous question and answer platform powered by Fully Homomorphic Encryption",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}


