export class OrderPlacedEvent {
  constructor(
    public readonly orderId: string,
    public readonly userId: string,
    public readonly total: number,
    public readonly items: any[],
  ) {}
}

export class OrderStatusChangedEvent {
  constructor(
    public readonly orderId: string,
    public readonly oldStatus: string,
    public readonly newStatus: string,
    public readonly userId: string,
  ) {}
}

export class OrderDeliveredEvent {
  constructor(
    public readonly orderId: string,
    public readonly userId: string,
    public readonly vendorIds: string[],
  ) {}
}
