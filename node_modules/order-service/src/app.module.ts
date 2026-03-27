
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { OrderController } from './adapters/order.controller';
import { OrderService } from './application/order.service';
import { OrderSaga } from './saga/order.saga';
import { InMemoryOrderRepository } from './adapters/order.repository.impl';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'PAYMENT_SERVICE',
        transport: Transport.TCP,
        options: { host: 'localhost', port: 4002 },
      },
    ]),
  ],
  controllers: [OrderController, OrderSaga],
  providers: [
    OrderService,
    {
      provide: 'OrderRepository',
      useClass: InMemoryOrderRepository,
    },
  ],
})
export class AppModule {}
