export interface PlatformEvent<TPayload = unknown> {
  id: string;
  occurredAt: Date;
  payload: TPayload;
  type: string;
}

export interface EventPublisher {
  publish(event: PlatformEvent): Promise<void>;
}
