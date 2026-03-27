
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class PaymentService {
  constructor(
    @Inject('ORDER_SERVICE') private readonly client: ClientProxy,
  ) {}

  process(orderId: string) {
    const success = Math.random() > 0.5;

    if (success) {
      console.log('EVENT -> payment_success', orderId);
      this.client.emit('payment_success', orderId);
    } else {
      console.log('EVENT -> payment_failed', orderId);
      this.client.emit('payment_failed', orderId);
    }
  }
}
