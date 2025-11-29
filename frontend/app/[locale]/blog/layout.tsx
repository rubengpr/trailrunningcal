import Navbar from '@/components/navbar';
import Footer from '@/components/footer';

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
