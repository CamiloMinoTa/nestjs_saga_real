# Arquitectura del Proyecto: Microservicios, SAGA y Hexagonal

## Introducción

Este documento detalla cómo la estructura de carpetas y archivos del proyecto implementa las arquitecturas de microservicios, el patrón SAGA y la arquitectura hexagonal. Se explica por servicio, carpeta y archivo, mostrando cómo contribuyen a cada patrón. El proyecto usa NestJS con TCP para comunicación entre servicios. Se incluyen snippets de código con comentarios para ilustrar implementaciones clave.

## Order-Service

### Arquitectura Hexagonal Implementada Completamente

#### src/domain/
- **order.entity.ts**: Define la clase `Order` con propiedades `id` (string) y `status` ('CREATED' | 'CONFIRMED' | 'CANCELLED'). Representa el núcleo del dominio puro, encapsulando la lógica de negocio sin dependencias externas. Cumple la arquitectura hexagonal al mantener la entidad independiente de frameworks o infraestructura.

  ```typescript
  // Entidad de dominio puro: representa un pedido sin dependencias externas (hexagonal - domain layer)
  export class Order {
    constructor(
      public id: string,
      public status: 'CREATED' | 'CONFIRMED' | 'CANCELLED',
    ) {}
  }
  ```

#### src/ports/
- **order.repository.ts**: Interfaz `OrderRepository` que define contratos para operaciones como `save(order: Order)` y `findById(id: string)`. Actúa como puerto de salida, desacoplando la capa de aplicación de implementaciones concretas de persistencia.

  ```typescript
  import { Order } from '../domain/order.entity';

  // Puerto de salida: interfaz que define contratos para persistencia (hexagonal - ports layer)
  export interface OrderRepository {
    save(order: Order): Promise<void>;
    findById(id: string): Promise<Order | undefined>;
  }
  ```

#### src/adapters/
- **order.controller.ts**: Controlador `@Controller('orders')` con endpoint POST para crear pedidos. Es un adaptador de entrada que traduce solicitudes HTTP REST a llamadas del servicio de aplicación, exponiendo la API externa.

  ```typescript
  import { Controller, Post } from '@nestjs/common';
  import { OrderService } from '../application/order.service';

  // Adaptador de entrada: traduce HTTP a lógica de aplicación (hexagonal - adapters layer)
  @Controller('orders')
  export class OrderController {
    constructor(private readonly service: OrderService) {}

    @Post()
    create() {
      return this.service.createOrder();
    }
  }
  ```

- **order.repository.impl.ts**: Clase `InMemoryOrderRepository` que implementa `OrderRepository` usando un `Map` para almacenamiento en memoria. Adaptador de salida que cumple el puerto, permitiendo cambiar fácilmente a una base de datos (ej. MongoDB) sin modificar el dominio o aplicación.

  ```typescript
  import { OrderRepository } from '../ports/order.repository';
  import { Order } from '../domain/order.entity';

  // Adaptador de salida: implementación concreta del puerto (hexagonal - adapters layer)
  export class InMemoryOrderRepository implements OrderRepository {
    private orders = new Map<string, Order>();

    async save(order: Order) {
      this.orders.set(order.id, order);
    }

    async findById(id: string) {
      return this.orders.get(id);
    }
  }
  ```

#### src/application/
- **order.service.ts**: Servicio `@Injectable` que orquesta la lógica de negocio. Crea pedidos, confirma/cancela usando el puerto del repositorio, y emite eventos TCP. Capa de aplicación que coordina operaciones sin depender de detalles de infraestructura.

  ```typescript
  import { Inject, Injectable } from '@nestjs/common';
  import { ClientProxy } from '@nestjs/microservices';
  import { OrderRepository } from '../ports/order.repository';
  import { Order } from '../domain/order.entity';
  import { randomUUID } from 'crypto';

  // Servicio de aplicación: orquesta lógica usando puertos (hexagonal - application layer)
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
      this.client.emit('order_created', order.id); // Emite evento para SAGA

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
  ```

#### src/saga/
- **order.saga.ts**: Controlador `@Controller` con decoradores `@EventPattern` para escuchar eventos 'payment_success' y 'payment_failed'. Implementa la orquestración en el patrón SAGA, coordinando el flujo distribuido al actualizar pedidos basado en respuestas del payment-service.

  ```typescript
  import { Controller } from '@nestjs/common';
  import { EventPattern, Payload } from '@nestjs/microservices';
  import { OrderService } from '../application/order.service';

  // Orquestración SAGA: coordina flujo distribuido escuchando eventos (SAGA pattern)
  @Controller()
  export class OrderSaga {
    constructor(private readonly service: OrderService) {}

    @EventPattern('payment_success')
    handleSuccess(@Payload() orderId: string) {
      console.log('EVENT <- payment_success', orderId);
      this.service.confirm(orderId); // Confirma pedido en caso de éxito
    }

    @EventPattern('payment_failed')
    handleFail(@Payload() orderId: string) {
      console.log('EVENT <- payment_failed', orderId);
      this.service.cancel(orderId); // Cancela pedido en caso de fallo (compensación)
    }
  }
  ```

#### src/
- **app.module.ts**: Módulo `@Module` que configura dependencias: importa `ClientsModule` para TCP a payment-service (puerto 4002), registra controladores (OrderController, OrderSaga) y proveedores (OrderService con inyección de 'OrderRepository'). Integra hexagonal (inyecta repositorio) y microservicios (comunicación TCP).

  ```typescript
  import { Module } from '@nestjs/common';
  import { ClientsModule, Transport } from '@nestjs/microservices';
  import { OrderController } from './adapters/order.controller';
  import { OrderService } from './application/order.service';
  import { OrderSaga } from './saga/order.saga';
  import { InMemoryOrderRepository } from './adapters/order.repository.impl';

  // Módulo que integra hexagonal y microservicios
  @Module({
    imports: [
      ClientsModule.register([
        {
          name: 'PAYMENT_SERVICE',
          transport: Transport.TCP,
          options: { host: 'localhost', port: 4002 }, // Comunicación TCP con payment-service
        },
      ]),
    ],
    controllers: [OrderController, OrderSaga],
    providers: [
      OrderService,
      {
        provide: 'OrderRepository',
        useClass: InMemoryOrderRepository, // Inyección de adaptador (hexagonal)
      },
    ],
  })
  export class AppModule {}
  ```

- **main.ts**: Punto de entrada que crea un microservicio TCP en puerto 4001 usando `NestFactory.createMicroservice`. Habilita la comunicación asíncrona en la arquitectura de microservicios.

  ```typescript
  import 'reflect-metadata';
  import { NestFactory } from '@nestjs/core';
  import { AppModule } from './app.module';
  import { Transport } from '@nestjs/microservices';

  // Punto de entrada: configura microservicio TCP (microservicios architecture)
  async function bootstrap() {
    const app = await NestFactory.createMicroservice(AppModule, {
      transport: Transport.TCP,
      options: { host: 'localhost', port: 4001 },
    });

    await app.listen();
    console.log('Order TCP microservice on 4001');
  }
  bootstrap();
  ```

### Cómo Cumple las Arquitecturas
- **Hexagonal**: Separación estricta en domain (entidad pura), ports (interfaces), adapters (implementaciones concretas), application (lógica orquestada). Permite testabilidad (mocks en puertos) y cambios (ej. BD) sin afectar dominio.
- **SAGA**: Orquestración centralizada: emite 'order_created' y escucha respuestas para confirmar/cancelar, manejando transacciones distribuidas con compensaciones.
- **Microservicios**: Servicio autónomo con API REST y comunicación TCP, ejecutándose en puerto separado para escalabilidad independiente.

## Payment-Service

### Estructura Simplificada (Hexagonal Parcial)

#### src/application/
- **payment.service.ts**: Servicio `@Injectable` que procesa pagos simulados con `Math.random()` (50% éxito/fallo). Emite eventos 'payment_success' o 'payment_failed' vía TCP. Capa de aplicación básica que maneja lógica de pago sin separación hexagonal completa.

  ```typescript
  import { Inject, Injectable } from '@nestjs/common';
  import { ClientProxy } from '@nestjs/microservices';

  // Servicio de aplicación básico: procesa pagos y emite eventos (parcial hexagonal)
  @Injectable()
  export class PaymentService {
    constructor(
      @Inject('ORDER_SERVICE') private readonly client: ClientProxy,
    ) {}

    process(orderId: string) {
      const success = Math.random() > 0.5; // Simulación aleatoria

      if (success) {
        console.log('EVENT -> payment_success', orderId);
        this.client.emit('payment_success', orderId); // Éxito en SAGA
      } else {
        console.log('EVENT -> payment_failed', orderId);
        this.client.emit('payment_failed', orderId); // Fallo en SAGA
      }
    }
  }
  ```

#### src/saga/
- **payment.listener.ts**: Controlador `@Controller` con `@EventPattern('order_created')` para escuchar creación de pedidos. Implementa coreografía en SAGA, respondiendo a eventos del order-service sin orquestrador central.

  ```typescript
  import { Controller } from '@nestjs/common';
  import { EventPattern, Payload } from '@nestjs/microservices';
  import { PaymentService } from '../application/payment.service';

  // Coreografía SAGA: responde a eventos sin orquestrador central (SAGA pattern)
  @Controller()
  export class PaymentListener {
    constructor(private readonly service: PaymentService) {}

    @EventPattern('order_created')
    handle(@Payload() orderId: string) {
      console.log('EVENT <- order_created', orderId);
      this.service.process(orderId); // Procesa pago en respuesta a evento
    }
  }
  ```

#### src/
- **app.module.ts**: Módulo `@Module` que configura `ClientsModule` para TCP a order-service (puerto 4001). Registra PaymentListener como controlador y PaymentService como proveedor. Integra comunicación en microservicios.

  ```typescript
  import { Module } from '@nestjs/common';
  import { ClientsModule, Transport } from '@nestjs/microservices';
  import { PaymentService } from './application/payment.service';
  import { PaymentListener } from './saga/payment.listener';

  // Módulo que integra microservicios vía TCP
  @Module({
    imports: [
      ClientsModule.register([
        {
          name: 'ORDER_SERVICE',
          transport: Transport.TCP,
          options: { host: 'localhost', port: 4001 }, // Comunicación con order-service
        },
      ]),
    ],
    controllers: [PaymentListener],
    providers: [PaymentService],
  })
  export class AppModule {}
  ```

- **main.ts**: Punto de entrada que crea microservicio TCP en puerto 4002. Servicio autónomo que responde a eventos.

  ```typescript
  import 'reflect-metadata';
  import { NestFactory } from '@nestjs/core';
  import { AppModule } from './app.module';
  import { Transport } from '@nestjs/microservices';

  // Punto de entrada: configura microservicio TCP (microservicios architecture)
  async function bootstrap() {
    const app = await NestFactory.createMicroservice(AppModule, {
      transport: Transport.TCP,
      options: { host: 'localhost', port: 4002 },
    });

    await app.listen();
    console.log('Payment TCP microservice on 4002');
  }
  bootstrap();
  ```

### Cómo Cumple las Arquitecturas
- **Hexagonal**: Parcial; application maneja lógica, pero falta domain/ports/adapters explícitos. Puede extenderse agregando entidades de pago y repositorios.
- **SAGA**: Coreografía: escucha eventos y emite respuestas, coordinando transacciones distribuidas de manera descentralizada.
- **Microservicios**: Servicio independiente con TCP, procesando pagos en respuesta a eventos del order-service.

## Notas Generales sobre las Arquitecturas
- **Microservicios**: Servicios separados (order y payment) permiten despliegue independiente, con TCP asegurando comunicación eficiente y acoplamiento bajo. Cada uno tiene su main.ts y app.module.ts para autonomía.
- **SAGA**: Patrón distribuido implementado con eventos TCP: orquestración en order-service inicia y coordina, coreografía en payment-service responde. Maneja fallos con compensaciones (cancelar pedido si pago falla), evitando inconsistencias.
- **Hexagonal**: Solo order-service la implementa completamente para demostrar separación; payment-service es más pragmático. Beneficios: fácil testing (inyectar mocks), mantenibilidad (cambiar adaptadores sin tocar dominio).
- **Extensiones**: Para producción, reemplaza `InMemoryOrderRepository` por BD (ej. TypeORM), agrega compensaciones en SAGA (reembolsos), y completa hexagonal en payment-service.

Este README explica la estructura y roles; revisa los archivos para código detallado. Para ejecutar, sigue el README.md principal.