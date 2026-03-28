import { useEffect, useState } from "react";
import axios from "axios";

interface Product {
  id: number;
  name: string;
  price: number;
  imgUrl: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get("http://localhost:8080/products")
      .then((res) => setProducts(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* NAVBAR */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-purple-500">🛒 DevStore</h1>

          <div className="flex items-center gap-6">
            <input
              type="text"
              placeholder="Buscar produtos..."
              className="bg-gray-800 px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-purple-600"
            />

            <button className="relative">
              🛒
              <span className="absolute -top-2 -right-2 bg-purple-600 text-xs px-1.5 rounded-full">
                0
              </span>
            </button>

            <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center">
              R
            </div>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="bg-gradient-to-r from-purple-900 via-purple-800 to-gray-900 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold mb-4">
            Tecnologia com estilo 🔥
          </h2>
          <p className="text-gray-300 max-w-xl">
            Os melhores produtos com design moderno e performance absurda.
          </p>
        </div>
      </section>

      {/* PRODUCTS */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-semibold mb-8 text-purple-400">
          Produtos
        </h2>

        {/* LOADING */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="bg-gray-900 animate-pulse rounded-2xl h-72"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {products.map((product) => (
              <div
                key={product.id}
                className="group bg-gray-900 rounded-2xl overflow-hidden shadow-lg hover:shadow-purple-700/40 transition duration-300 hover:-translate-y-2"
              >
                {/* IMAGE */}
                {product.imgUrl ? (
                  <img
                    src={product.imgUrl}
                    alt={product.name}
                    className="w-full h-48 object-cover group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  <div className="w-full h-48 flex items-center justify-center bg-gray-800 text-gray-500">
                    Sem imagem
                  </div>
                )}

                {/* CONTENT */}
                <div className="p-5 flex flex-col gap-3">
                  <h3 className="text-lg font-semibold line-clamp-2">
                    {product.name}
                  </h3>

                  <p className="text-purple-400 text-xl font-bold drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]">
                    R$ {product.price.toFixed(2)}
                  </p>

                  <button className="mt-auto bg-purple-700 hover:bg-purple-600 hover:scale-105 active:scale-95 transition px-4 py-2 rounded-lg font-medium">
                    Comprar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
