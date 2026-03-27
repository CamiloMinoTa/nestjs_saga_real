
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice({
    transport: Transport.TCP,
    options: { host: 'localhost', port: 4001 },
  });

  await app.startAllMicroservices();
  await app.listen(3001);
  console.log('Order HTTP on 3001, TCP microservice on 4001');
}
bootstrap();
