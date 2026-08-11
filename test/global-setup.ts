import * as dotenv from 'dotenv'
import { resolve } from 'path'
import { Client } from 'pg'

dotenv.config({ path: resolve(__dirname, '../.env') })

export default async () => {
  const client = new Client({
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASS || 'postgres',
    database: 'postgres',
  })

  await client.connect()

  const dbName = process.env.TEST_DB_NAME || 'sharepoint_test'

  await client.query(`DROP DATABASE IF EXISTS ${dbName}`)
  await client.query(`CREATE DATABASE ${dbName}`)

  await client.end()
}
