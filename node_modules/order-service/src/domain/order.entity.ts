
export class Order {
  constructor(
    public id: string,
    public status: 'CREATED' | 'CONFIRMED' | 'CANCELLED',
  ) {}
}
