export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full px-6 sm:px-10 lg:px-16 sm:py-8 lg:py-12">
      {children}
    </div>
  );
}
