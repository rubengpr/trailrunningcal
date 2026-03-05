import Navbar from '@/components/layout/navbar';
import Footer from '@/components/layout/footer';

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="grow">{children}</main>
      <Footer />
    </div>
  );
}
