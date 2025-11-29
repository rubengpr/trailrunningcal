export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full px-6 sm:px-10 lg:px-16 sm:py-16 lg:py-20">
      {children}
    </div>
  );
}
