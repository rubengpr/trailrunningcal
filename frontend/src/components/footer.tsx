export default function Footer() {
  return (
    <footer className="border-t border-indigo-100/60 bg-white/70 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-600">
        <p>© {new Date().getFullYear()} Trail Running Cal</p>
      </div>
    </footer>
  );
}
