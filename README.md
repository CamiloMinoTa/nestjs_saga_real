
# NestJS SAGA (TCP) - Ready to Run

## Requirements
- Node.js 18+

## Install (from root)
```bash
npm install
```

## Run services (separate terminals)
```bash
cd payment-service && npm run start:dev
```
```bash
cd order-service && npm run start:dev
```

## Test
Create an order:
```bash
curl -X POST http://localhost:3001/orders
```

Check logs for saga flow:
- order_created
- payment_success | payment_failed
- order CONFIRMED | CANCELLED
