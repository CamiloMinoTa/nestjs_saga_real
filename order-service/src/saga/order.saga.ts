
import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { OrderService } from '../application/order.service';

@Controller()
export class OrderSaga {
  constructor(private readonly service: OrderService) {}

  @EventPattern('payment_success')
  handleSuccess(@Payload() orderId: string) {
    console.log('EVENT <- payment_success', orderId);
    this.service.confirm(orderId);
  }

  @EventPattern('payment_failed')
  handleFail(@Payload() orderId: string) {
    console.log('EVENT <- payment_failed', orderId);
    this.service.cancel(orderId);
  }
}
