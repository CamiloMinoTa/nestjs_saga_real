
import { Controller, Post } from '@nestjs/common';
import { OrderService } from '../application/order.service';

@Controller('orders')
export class OrderController {
  constructor(private readonly service: OrderService) {}

  @Post()
  create() {
    return this.service.createOrder();
  }
}
