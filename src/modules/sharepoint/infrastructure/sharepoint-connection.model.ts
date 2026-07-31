export class SharepointConnectionModel {
  constructor(
    public readonly status: 'Success' | 'Failed',
    public readonly token?: string,
    public readonly error?: string,
  ) {}
}
