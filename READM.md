
# NestJS SAGA (TCP) - Proyecto de Microservicios con Arquitectura Hexagonal

## Descripción General

Este proyecto es una implementación práctica de microservicios utilizando **NestJS**, enfocada en demostrar el patrón **SAGA** para manejar transacciones distribuidas y la **arquitectura hexagonal** (también conocida como arquitectura de puertos y adaptadores) en partes clave del sistema. Está diseñado como un ejemplo educativo para un sistema de e-commerce básico, donde se gestionan pedidos y pagos de manera distribuida.

El proyecto incluye dos microservicios principales (`order-service` y `payment-service`), un frontend en React (usando Vite), y está configurado como un monorepo con workspaces de npm. Los servicios se comunican entre sí usando TCP, permitiendo una arquitectura distribuida y escalable.

### Propósito
- Demostrar cómo coordinar transacciones distribuidas en microservicios sin transacciones globales.
- Mostrar la separación de responsabilidades mediante la arquitectura hexagonal.
- Proporcionar un ejemplo "ready to run" que se puede extender fácilmente (ej. agregar bases de datos, más servicios o lógica de negocio).

## Arquitecturas Implementadas

### 1. Arquitectura de Microservicios
- **Descripción**: El sistema está dividido en servicios independientes que se ejecutan de forma autónoma. Cada servicio tiene su propia base de código, dependencias y ciclo de vida.
- **Servicios**:
  - **order-service**: Maneja la creación y gestión de pedidos. Actúa como el servicio orquestador principal.
  - **payment-service**: Maneja el procesamiento de pagos asociados a los pedidos.
  - **frontend**: Aplicación React simple para interactuar con los servicios (actualmente un boilerplate básico).
- **Comunicación**: Los servicios usan TCP (protocolo interno de NestJS) para intercambiar mensajes, lo que permite una comunicación eficiente y desacoplada.
- **Ventajas**: Escalabilidad, mantenibilidad y resiliencia. Cada servicio puede desplegarse y escalarse independientemente.

### 2. Patrón SAGA
- **Descripción**: SAGA es un patrón para manejar transacciones distribuidas en microservicios. Coordina una serie de operaciones locales, permitiendo compensaciones (rollback) si una operación falla, manteniendo la consistencia eventual.
- **Tipo implementado**: Combinación de **orquestración** (en `order-service`) y **coreografía** (en `payment-service`).
- **Dónde se aplica**:
  - **order-service**: El archivo `src/saga/order.saga.ts` define la saga orquestrada. Inicia el flujo, envía mensajes TCP al `payment-service` y maneja las respuestas para confirmar o cancelar pedidos.
  - **payment-service**: El archivo `src/saga/payment.listener.ts` actúa como listener, procesa pagos y envía eventos de vuelta (éxito o fallo).
- **Flujo típico**:
  1. Usuario crea un pedido vía POST a `/orders`.
  2. `order-service` inicia la saga y envía mensaje a `payment-service`.
  3. `payment-service` procesa el pago (simulado con lógica aleatoria).
  4. Respuesta: Si éxito, confirma pedido; si fallo, cancela.
  5. Eventos en logs: `order_created`, `payment_success` o `payment_failed`, `order CONFIRMED` o `CANCELLED`.
- **Ventajas**: Evita inconsistencias en sistemas distribuidos, ideal para escenarios como e-commerce donde las operaciones deben ser atómicas a nivel distribuido.

### 3. Arquitectura Hexagonal (Puertos y Adaptadores)
- **Descripción**: También conocida como arquitectura limpia, separa la lógica de negocio (dominio) de las preocupaciones externas (frameworks, bases de datos, APIs). Hace el código más testable, mantenible y desacoplado.
- **Capas**:
  - **Dominio (Domain)**: Lógica de negocio pura, sin dependencias externas.
  - **Puertos (Ports)**: Interfaces que definen contratos para interactuar con el exterior (ej. repositorios).
  - **Adaptadores (Adapters)**: Implementaciones concretas de los puertos (ej. controladores HTTP, repositorios en memoria).
  - **Aplicación (Application)**: Servicios que orquestan la lógica usando los puertos.
- **Dónde se aplica**:
  - **order-service**: Completamente estructurado en capas hexagonales:
    - `src/domain/order.entity.ts`: Entidad `Order` (dominio puro).
    - `src/ports/order.repository.ts`: Interfaz del repositorio (puerto).
    - `src/adapters/order.repository.impl.ts`: Implementación en memoria (adaptador).
    - `src/adapters/order.controller.ts`: Controlador HTTP (adaptador de entrada).
    - `src/application/order.service.ts`: Servicio de aplicación que usa el puerto.
  - **payment-service**: No está completamente implementado en hexagonal; se enfoca en la lógica de pago y saga, pero puede extenderse.
- **Ventajas**: Fácil cambiar adaptadores (ej. de memoria a base de datos) sin modificar el dominio. Mejora la testabilidad y el mantenimiento.

## Estructura del Proyecto

```
nestjs_saga_real/
├── package.json                 # Configuración del monorepo (workspaces)
├── README.md                    # Este archivo
├── frontend/                    # Aplicación React (Vite)
│   ├── package.json
│   ├── src/
│   │   ├── App.tsx
│   │   └── ...
│   └── vite.config.ts
├── order-service/               # Microservicio de pedidos
│   ├── package.json
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── main.ts
│   │   ├── domain/              # Arquitectura hexagonal: dominio
│   │   │   └── order.entity.ts
│   │   ├── ports/               # Arquitectura hexagonal: puertos
│   │   │   └── order.repository.ts
│   │   ├── adapters/            # Arquitectura hexagonal: adaptadores
│   │   │   ├── order.controller.ts
│   │   │   └── order.repository.impl.ts
│   │   ├── application/         # Arquitectura hexagonal: aplicación
│   │   │   └── order.service.ts
│   │   └── saga/                # Patrón SAGA: orquestración
│   │       └── order.saga.ts
│   └── tsconfig.json
└── payment-service/             # Microservicio de pagos
    ├── package.json
    ├── src/
    │   ├── app.module.ts
    │   ├── main.ts
    │   ├── application/
    │   │   └── payment.service.ts
    │   └── saga/                # Patrón SAGA: coreografía
    │       └── payment.listener.ts
    └── tsconfig.json
```

## Requisitos
- Node.js 18+
- npm (viene con Node.js)

## Instalación
Desde la raíz del proyecto:
```bash
npm install
```
Esto instala dependencias para todos los workspaces (order-service, payment-service y frontend).

## Ejecución
Ejecuta cada servicio en terminales separadas para simular un entorno distribuido.

1. **Payment Service**:
   ```bash
   cd payment-service && npm run start:dev
   ```

2. **Order Service**:
   ```bash
   cd order-service && npm run start:dev
   ```

3. **Frontend** (opcional, para desarrollo):
   ```bash
   cd frontend && npm run dev
   ```

Los servicios estarán disponibles en:
- Order Service: `http://localhost:3001`
- Payment Service: `http://localhost:3002` (o similar, verifica logs)
- Frontend: `http://localhost:5173` (si ejecutas)

## Pruebas
### Crear un pedido
Envía una solicitud POST para crear un pedido:
```bash
curl -X POST http://localhost:3001/orders
```

### Verificar el flujo SAGA
Revisa los logs en las terminales de los servicios. Deberías ver un flujo como:
- `order_created`
- `payment_success` o `payment_failed` (aleatorio en la simulación)
- `order CONFIRMED` o `CANCELLED`

Si el pago falla, el pedido se cancela automáticamente, demostrando la compensación en SAGA.

### Otras pruebas
- Verifica endpoints adicionales si los agregas (ej. GET `/orders/:id`).
- Prueba con herramientas como Postman para solicitudes más complejas.

## Detalles Técnicos
- **Tecnologías**: NestJS (framework), TypeScript, TCP para comunicación interna, React + Vite para frontend.
- **Persistencia**: Actualmente simulada en memoria (arrays). Para producción, agrega bases de datos (ej. MongoDB, PostgreSQL) reemplazando los adaptadores.
- **Manejo de errores**: Básico; extiende con compensaciones completas en SAGA (ej. reembolsos).
- **Escalabilidad**: Los servicios pueden desplegarse en contenedores (Docker) o plataformas como Kubernetes.

## Extensiones y Mejoras Posibles
- **Agregar bases de datos**: Implementa repositorios reales (ej. MongoDB en `order.repository.impl.ts`).
- **Más servicios**: Agrega inventory-service o shipping-service con SAGA extendida.
- **Frontend completo**: Integra el frontend con los servicios vía REST o GraphQL.
- **Autenticación**: Agrega JWT o OAuth.
- **Monitoreo**: Integra herramientas como Prometheus o ELK stack.
- **Pruebas**: Agrega tests unitarios (Jest) y de integración.
- **Docker**: Conteneriza los servicios para despliegue fácil.

## Contribución
Este es un proyecto educativo. Siéntete libre de forkear, modificar y contribuir. Para preguntas, abre un issue en el repositorio.

## Licencia
MIT License (o la que apliques).

---

¡Disfruta explorando microservicios con NestJS, SAGA y arquitectura hexagonal!
