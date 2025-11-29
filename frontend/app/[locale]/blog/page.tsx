import Link from 'next/link';

const BLOG_POSTS = [
  {
    id: 1,
    title: 'Calendario de Carreras 2025: Las imprescindibles',
    excerpt:
      'Una selección curada de las carreras de trail running más espectaculares para la próxima temporada. Desde los Pirineos hasta los Picos de Europa.',
    date: 'Octubre 15, 2025',
    readTime: '5 min',
    category: 'Calendario',
    color: 'bg-emerald-900',
    slug: 'carreras-trailrunning-2025',
  },
  {
    id: 2,
    title: 'Nutrición en Ultra Distancia: Guía Básica',
    excerpt:
      'Descubre cómo gestionar tu energía en carreras de más de 50km. Estrategias de hidratación, geles y comida real para evitar las pájaras.',
    date: 'Octubre 10, 2025',
    readTime: '8 min',
    category: 'Nutrición',
    color: 'bg-slate-800',
    slug: 'nutricion-ultra-distancia',
  },
  {
    id: 3,
    title: 'Material Obligatorio: ¿Qué llevar en la mochila?',
    excerpt:
      'Repasamos el material obligatorio habitual en las carreras de montaña y te damos consejos para optimizar el peso sin comprometer tu seguridad.',
    date: 'Septiembre 28, 2025',
    readTime: '6 min',
    category: 'Equipamiento',
    color: 'bg-indigo-900',
    slug: 'material-obligatorio-mochila',
  },
];

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;

  return (
    <>
      {/* Header Section */}
      <div className="py-16 sm:py-24 text-center px-4">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
          El blog de Trail Running Calendar
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
          Información de carreras, consejos de entrenamiento, nutrición y más.
        </p>
      </div>

      {/* Blog Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
          {BLOG_POSTS.map((post) => (
            <Link key={post.id} href={`/${locale}/blog/${post.slug}`}>
              <article
                key={post.id}
                className="flex flex-col group cursor-pointer p-4 -m-4 rounded-2xl transition-all duration-200 hover:bg-white hover:ring-1 hover:ring-gray-200 hover:shadow-lg"
              >
                {/* Image Placeholder */}
                <div
                  className={`aspect-16/10 w-full rounded-xl overflow-hidden mb-6 ${post.color} relative shadow-sm`}
                >
                  <div className="absolute inset-0 flex items-center justify-center opacity-50">
                    <span className="text-white text-6xl font-black tracking-tighter opacity-20">
                      TRC
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-col grow">
                  <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                    <time dateTime="2025-10-15">{post.date}</time>
                    <span>•</span>
                    <span>{post.readTime}</span>
                  </div>

                  <h3 className="text-xl font-bold text-gray-700 mb-3 group-hover:text-gray-950 transition-colors">
                    {post.title}
                  </h3>

                  <p className="text-gray-600 leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
