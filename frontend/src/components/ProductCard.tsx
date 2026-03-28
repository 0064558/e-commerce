type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  imgUrl: string;
};

type Props = {
  product: Product;
};

export function ProductCard({ product }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition p-4 flex flex-col">
      <img
        src={product.imgUrl}
        alt={product.name}
        className="h-48 w-full object-cover rounded-xl mb-3"
      />

      <h2 className="text-lg font-semibold">{product.name}</h2>

      <p className="text-sm text-gray-500 flex-grow">
        {product.description}
      </p>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xl font-bold text-green-600">
          R$ {product.price.toFixed(2)}
        </span>

        <button className="bg-black text-white px-4 py-2 rounded-xl hover:bg-gray-800">
          Comprar
        </button>
      </div>
    </div>
  );
}