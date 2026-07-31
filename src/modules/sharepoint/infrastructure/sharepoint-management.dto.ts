export interface SharepointSubscriptionDto {
  contentType: string
  status: string
  webhook?: unknown
}

export interface SharepointContentDto {
  contentUri: string
  contentId: string
  contentType: string
  contentCreated: string
  contentExpiration: string
}

export interface AppAccessContextDto {
  AuthTime?: string
  ClientAppId?: string
  ClientAppName?: string
  CorrelationId?: string
  TokenIssuedAtTime?: string
  UniqueTokenId?: string
}

export interface SharepointActivityDto {
  // Core Fields
  CreationTime: string
  Id: string
  Operation: string
  OrganizationId: string
  RecordType: number
  UserKey: string
  UserType?: number
  Version?: number
  Workload: string
  UserId: string
  ClientIP?: string
  ObjectId?: string
  CorrelationId?: string

  // SharePoint / OneDrive Specific Fields
  ApplicationId?: string
  ApplicationDisplayName?: string
  AuthenticationType?: string
  BrowserName?: string
  BrowserVersion?: string
  EventSource?: string
  GeoLocation?: string
  IsManagedDevice?: boolean
  ItemType?: string
  ListId?: string
  ListItemUniqueId?: string
  Platform?: string
  Site?: string
  SiteUrl?: string
  UserAgent?: string
  WebId?: string
  DeviceDisplayName?: string
  HighPriorityMediaProcessing?: boolean
  ListBaseType?: number
  ListServerTemplate?: number
  SourceRelativeUrl?: string
  SourceFileName?: string
  SourceFileExtension?: string

  // App Access Context
  AppAccessContext?: AppAccessContextDto

  // Allow for other unforeseen properties
  [key: string]: unknown
}
