
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { OrderRepository } from '../ports/order.repository';
import { Order } from '../domain/order.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class OrderService {
  constructor(
    @Inject('OrderRepository') private readonly repo: OrderRepository,
    @Inject('PAYMENT_SERVICE') private readonly client: ClientProxy,
  ) {}

  async createOrder(): Promise<Order> {
    const order = new Order(randomUUID(), 'CREATED');
    await this.repo.save(order);

    console.log('EVENT -> order_created', order.id);
    this.client.emit('order_created', order.id);

    return order;
  }

  async confirm(id: string) {
    const order = await this.repo.findById(id);
    if (!order) return;
    order.status = 'CONFIRMED';
    await this.repo.save(order);
    console.log('ORDER CONFIRMED', id);
  }

  async cancel(id: string) {
    const order = await this.repo.findById(id);
    if (!order) return;
    order.status = 'CANCELLED';
    await this.repo.save(order);
    console.log('ORDER CANCELLED', id);
  }
}
