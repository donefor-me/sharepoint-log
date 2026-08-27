export const SHAREPOINT_CONSTANTS = {
  /** Content Types */
  CONTENT_TYPE_AUDIT_SHAREPOINT: 'Audit.SharePoint',
  CONTENT_TYPE_AUDIT_EXCHANGE: 'Audit.Exchange',
  CONTENT_TYPE_AUDIT_AZURE_AD: 'Audit.AzureActiveDirectory',
  CONTENT_TYPE_AUDIT_GENERAL: 'Audit.General',

  /** API Endpoints */
  API_BASE_URL: 'https://manage.office.com/api/v1.0',
  AUTH_BASE_URL: 'https://login.microsoftonline.com',
  AUTH_SCOPE: 'https://manage.office.com/.default',

  /** Microsoft Management API error codes indicating subscription already active */
  SUBSCRIPTION_ALREADY_ACTIVE_CODES: ['AF20011', 'AF20024'] as const,
} as const
