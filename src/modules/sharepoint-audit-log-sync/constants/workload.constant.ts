/**
 * Defines common Workload values returned from the Microsoft Office 365 Management Activity API.
 */
export const Office365Workload = {
  SHAREPOINT: 'SharePoint',
  ONEDRIVE: 'OneDrive',
  EXCHANGE: 'Exchange',
  AZURE_ACTIVE_DIRECTORY: 'AzureActiveDirectory',
  MICROSOFT_TEAMS: 'MicrosoftTeams',
  SECURITY_COMPLIANCE_CENTER: 'SecurityComplianceCenter',
  YAMMER: 'Yammer',
  POWERBI: 'PowerBI',
  CRM: 'CRM',
  STREAM: 'Stream',
} as const

/** TypeScript type hinting for Office 365 Workloads */
export type Office365WorkloadType =
  (typeof Office365Workload)[keyof typeof Office365Workload]
