import { registerAs } from '@nestjs/config'

export default registerAs('sharepoint', () => ({
  tenantId: process.env.O365_TENANT_ID,
  clientId: process.env.O365_CLIENT_ID,
  clientSecret: process.env.O365_CLIENT_SECRET,
}))
