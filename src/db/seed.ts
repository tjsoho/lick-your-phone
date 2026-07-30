import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { sql } from 'drizzle-orm'
import * as schema from './schema'
import seedData from '../../docs/services.seed.json'

const connectionString = process.env.DATABASE_URL!
const client = postgres(connectionString, { prepare: false })
const db = drizzle(client, { schema })

async function seed() {
  console.log('Seeding database...')

  // 1. Seed states
  const stateMap: Record<string, string> = {}
  const stateRows = [
    { code: 'QLD', name: 'Queensland' },
    { code: 'NSW', name: 'New South Wales' },
    { code: 'VIC', name: 'Victoria' },
    { code: 'WA', name: 'Western Australia' },
  ]

  for (const s of stateRows) {
    const [row] = await db
      .insert(schema.states)
      .values(s)
      .onConflictDoUpdate({
        target: schema.states.code,
        set: { name: s.name },
      })
      .returning({ id: schema.states.id })
    stateMap[s.code] = row.id
  }
  console.log(`  Seeded ${stateRows.length} states`)

  // 2. Seed services
  const services = seedData.services as Array<Record<string, unknown>>
  const serviceMap: Record<string, string> = {}

  for (let i = 0; i < services.length; i++) {
    const svc = services[i]
    const serviceValues = {
      slug: svc.slug as string,
      name: svc.name as string,
      template: (svc.template as string) || null,
      billing: svc.billing as 'one_off' | 'recurring_monthly' | 'in_kind',
      term: (svc.term as string) || null,
      targetPriceCents: (svc.target_price as number) ?? 0,
      discountPct: (svc.discount_pct as number) ?? null,
      discountWindowHours: (svc.discount_window_hours as number) ?? null,
      priceDisplayPeriod: (svc.price_display_period as string) || null,
      requiresOtherService: (svc.requires_other_service as boolean) ?? false,
      sequence: i + 1,
    }

    const [row] = await db
      .insert(schema.services)
      .values(serviceValues)
      .onConflictDoUpdate({
        target: schema.services.slug,
        set: {
          name: serviceValues.name,
          template: serviceValues.template,
          billing: serviceValues.billing,
          term: serviceValues.term,
          targetPriceCents: serviceValues.targetPriceCents,
          discountPct: serviceValues.discountPct,
          discountWindowHours: serviceValues.discountWindowHours,
          priceDisplayPeriod: serviceValues.priceDisplayPeriod,
          requiresOtherService: serviceValues.requiresOtherService,
          sequence: serviceValues.sequence,
          updatedAt: sql`now()`,
        },
      })
      .returning({ id: schema.services.id })
    serviceMap[svc.slug as string] = row.id

    // Clean existing child rows for idempotency then re-insert
    const serviceId = row.id

    // Tiers
    if (svc.tiers && Array.isArray(svc.tiers)) {
      await db.delete(schema.serviceTiers).where(sql`service_id = ${serviceId}`)
      const tiers = svc.tiers as Array<{ slug: string; name: string; target_price: number }>
      for (let t = 0; t < tiers.length; t++) {
        await db.insert(schema.serviceTiers).values({
          serviceId,
          slug: tiers[t].slug,
          name: tiers[t].name,
          targetPriceCents: tiers[t].target_price,
          sequence: t + 1,
        })
      }
    }

    // Inclusions
    if (svc.inclusions && Array.isArray(svc.inclusions)) {
      await db.delete(schema.serviceInclusions).where(sql`service_id = ${serviceId}`)
      const inclusions = svc.inclusions as string[]
      for (let j = 0; j < inclusions.length; j++) {
        await db.insert(schema.serviceInclusions).values({
          serviceId,
          text: inclusions[j],
          sequence: j + 1,
        })
      }
    }

    // Client obligations
    if (svc.client_obligations && Array.isArray(svc.client_obligations)) {
      await db.delete(schema.serviceClientObligations).where(sql`service_id = ${serviceId}`)
      const obligations = svc.client_obligations as string[]
      for (let j = 0; j < obligations.length; j++) {
        await db.insert(schema.serviceClientObligations).values({
          serviceId,
          text: obligations[j],
          sequence: j + 1,
        })
      }
    }

    // Disclaimers
    if (svc.disclaimers && Array.isArray(svc.disclaimers)) {
      await db.delete(schema.serviceDisclaimers).where(sql`service_id = ${serviceId}`)
      const disclaimers = svc.disclaimers as string[]
      for (let j = 0; j < disclaimers.length; j++) {
        await db.insert(schema.serviceDisclaimers).values({
          serviceId,
          text: disclaimers[j],
          sequence: j + 1,
        })
      }
    }
  }
  console.log(`  Seeded ${services.length} services with tiers, inclusions, obligations, and disclaimers`)

  // 3. Create pages for each service
  for (let i = 0; i < services.length; i++) {
    const svc = services[i]
    const slug = svc.slug as string
    const serviceId = serviceMap[slug]

    await db
      .insert(schema.pages)
      .values({
        type: 'service',
        slug: `service-${slug}`,
        title: svc.name as string,
        sequence: i + 1,
        visible: true,
        serviceId,
      })
      .onConflictDoUpdate({
        target: schema.pages.slug,
        set: {
          title: svc.name as string,
          sequence: i + 1,
          serviceId,
          updatedAt: sql`now()`,
        },
      })
  }
  console.log(`  Seeded ${services.length} service pages`)

  console.log('Seed complete.')
  await client.end()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
