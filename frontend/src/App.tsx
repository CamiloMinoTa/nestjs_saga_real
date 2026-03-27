import { useState } from 'react';

type Order = {
  id: string;
  status: 'CREATED' | 'CONFIRMED' | 'CANCELLED';
};

function App() {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const createOrder = async (): Promise<void> => {
    setLoading(true);

    const res = await fetch('http://localhost:3001/orders', {
      method: 'POST'
    });

    const data: Order = await res.json();
    setOrder(data);

    // esperar resultado SAGA
    setTimeout(async () => {
      const updated = await fetch(`http://localhost:3001/orders/${data.id}`);
      const final: Order = await updated.json();
      setOrder(final);
      setLoading(false);
    }, 2000);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>🧩 SAGA Demo (TypeScript)</h1>

      <button onClick={createOrder}>
        Crear Orden
      </button>

      {loading && <p>⏳ Procesando...</p>}

      {order && (
        <div>
          <p><strong>ID:</strong> {order.id}</p>
          <p>
            <strong>Estado:</strong>
            {order.status === 'CREATED' && ' 🟡 CREATED'}
            {order.status === 'CONFIRMED' && ' 🟢 CONFIRMED'}
            {order.status === 'CANCELLED' && ' 🔴 CANCELLED'}
          </p>
        </div>
      )}
    </div>
  );
}

export default App;