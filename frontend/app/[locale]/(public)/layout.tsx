import Navbar from '@/components/navbar';
import Footer from '@/components/footer';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full text-gray-900 flex flex-col bg-white">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}
