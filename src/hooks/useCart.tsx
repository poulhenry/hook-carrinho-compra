import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) return JSON.parse(storagedCart);
    
    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productAmount = await api.get(`/stock/${productId}`);

      const productAlreadyExists = updatedCart.find((product) => product.id === productId);
      const amountStock = productAmount.data.amount;
      const amountCurrent = productAlreadyExists ? productAlreadyExists.amount : 0;
      const amount = amountCurrent + 1;

      if (amount > amountStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productAlreadyExists) {
        productAlreadyExists.amount = amount;
      } else {
        const product = await api.get(`/products/${productId}`);

        const newProduct = {
          ...product.data,
          amount: 1
        }

        updatedCart.push(newProduct);
      }
      
      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
    } catch {
      toast.error('Erro na adição do produto');
      return
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productsCart = [...cart];
      const productIndex = productsCart.findIndex(product => product.id === productId);

      if (productIndex <= 0) throw Error();

      productsCart.splice(productIndex, 1)

      setCart(productsCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(productsCart))
    } catch {
      toast.error('Erro na remoção do produto');
      return
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const updatedCart = [...cart];
      const { data: productAmount } = await api.get(`/stock/${productId}`);

      if (amount > productAmount.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      const productExists = updatedCart.find((product) => product.id === productId);

      if (!productExists) throw Error();

      productExists.amount = amount

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
      return
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
