export class UserRegisteredEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly name: string,
  ) {}
}

export class UserLoginEvent {
  constructor(
    public readonly userId: string,
    public readonly ip: string,
    public readonly userAgent: string,
  ) {}
}
