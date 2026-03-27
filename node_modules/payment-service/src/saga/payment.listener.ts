
import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PaymentService } from '../application/payment.service';

@Controller()
export class PaymentListener {
  constructor(private readonly service: PaymentService) {}

  @EventPattern('order_created')
  handle(@Payload() orderId: string) {
    console.log('EVENT <- order_created', orderId);
    this.service.process(orderId);
  }
}
