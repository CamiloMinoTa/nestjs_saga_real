
import { OrderRepository } from '../ports/order.repository';
import { Order } from '../domain/order.entity';

export class InMemoryOrderRepository implements OrderRepository {
  private orders = new Map<string, Order>();

  async save(order: Order) {
    this.orders.set(order.id, order);
  }

  async findById(id: string) {
    return this.orders.get(id);
  }
}
