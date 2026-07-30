import "dotenv/config"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "./schema"

const connectionString = process.env.DATABASE_URL!
const client = postgres(connectionString, { prepare: false })
const db = drizzle(client, { schema })

interface QuestionSeed {
  pageNumber: number
  section: string | null
  fieldLabel: string
  fieldType: string
  options: unknown
  required: boolean
  sequence: number
  config: unknown
  conditions?: ConditionSeed[]
}

interface ConditionSeed {
  conditionType: "service_signed" | "venue_state" | "answer_equals"
  conditionServiceSlug?: string
  conditionQuestionRef?: string
  conditionValue?: string
}

async function seedIntake() {
  console.log("Seeding intake questions...")

  // Look up service IDs by slug for conditions
  const servicesResult = await db
    .select({ id: schema.services.id, slug: schema.services.slug })
    .from(schema.services)
  const serviceBySlug: Record<string, string> = {}
  for (const s of servicesResult) {
    serviceBySlug[s.slug] = s.id
  }

  // Question definitions with internal refs for cross-question conditions
  const questionRefs: Record<string, string> = {}

  const questions: (QuestionSeed & { ref?: string })[] = [
    // ── Page 1: Welcome ──
    {
      pageNumber: 1,
      section: null,
      fieldLabel: "Access Email",
      fieldType: "email",
      options: null,
      required: true,
      sequence: 1,
      config: { placeholder: "your@email.com" },
    },

    // ── Page 2: Business Information ──
    // Section: Company Information
    {
      pageNumber: 2,
      section: "Company Information",
      fieldLabel: "Entity Name",
      fieldType: "text",
      options: null,
      required: true,
      sequence: 1,
      config: null,
    },
    {
      pageNumber: 2,
      section: "Company Information",
      fieldLabel: "ABN",
      fieldType: "abn",
      options: null,
      required: true,
      sequence: 2,
      config: null,
    },
    {
      pageNumber: 2,
      section: "Company Information",
      fieldLabel: "Mailing Address",
      fieldType: "address",
      options: null,
      required: true,
      sequence: 3,
      config: null,
    },
    {
      pageNumber: 2,
      section: "Company Information",
      fieldLabel: "Email for Invoices",
      fieldType: "email",
      options: null,
      required: true,
      sequence: 4,
      config: null,
    },
    {
      pageNumber: 2,
      section: "Company Information",
      fieldLabel: "Director First Name",
      fieldType: "text",
      options: null,
      required: true,
      sequence: 5,
      config: null,
    },
    {
      pageNumber: 2,
      section: "Company Information",
      fieldLabel: "Director Last Name",
      fieldType: "text",
      options: null,
      required: true,
      sequence: 6,
      config: null,
    },
    {
      pageNumber: 2,
      section: "Company Information",
      fieldLabel: "Director Email",
      fieldType: "email",
      options: null,
      required: false,
      sequence: 7,
      config: null,
    },
    // Section: Primary Contact
    {
      pageNumber: 2,
      section: "Primary Contact",
      fieldLabel: "First Name",
      fieldType: "text",
      options: null,
      required: true,
      sequence: 8,
      config: null,
    },
    {
      pageNumber: 2,
      section: "Primary Contact",
      fieldLabel: "Last Name",
      fieldType: "text",
      options: null,
      required: true,
      sequence: 9,
      config: null,
    },
    {
      pageNumber: 2,
      section: "Primary Contact",
      fieldLabel: "Phone",
      fieldType: "phone",
      options: null,
      required: true,
      sequence: 10,
      config: null,
    },
    {
      pageNumber: 2,
      section: "Primary Contact",
      fieldLabel: "Email",
      fieldType: "email",
      options: null,
      required: true,
      sequence: 11,
      config: null,
    },
    {
      pageNumber: 2,
      section: "Primary Contact",
      fieldLabel: "Other Team Members",
      fieldType: "repeatable_group",
      options: null,
      required: false,
      sequence: 12,
      config: {
        subFields: [
          { key: "name", label: "Name", type: "text" },
          { key: "email", label: "Email", type: "email" },
          { key: "phone", label: "Phone", type: "phone" },
        ],
      },
    },

    // ── Page 3: Choose Your Photographer ──
    {
      pageNumber: 3,
      section: null,
      fieldLabel: "Choose Your Photographer",
      fieldType: "static_content",
      options: null,
      required: false,
      sequence: 1,
      config: {
        content:
          "Select your preferred photographer(s) from the options below. Each photographer has their own style and specialties — view their portfolio to find the best match for your brand.",
      },
      conditions: [
        { conditionType: "service_signed", conditionServiceSlug: "photography" },
      ],
    },
    {
      pageNumber: 3,
      section: null,
      fieldLabel: "Select Photographer(s)",
      fieldType: "provider_picker",
      options: null,
      required: true,
      sequence: 2,
      config: { providerType: "photographer" },
      conditions: [
        { conditionType: "service_signed", conditionServiceSlug: "photography" },
      ],
    },

    // ── Page 4: Choose Your Videographer ──
    {
      pageNumber: 4,
      section: null,
      fieldLabel: "Choose Your Videographer",
      fieldType: "static_content",
      options: null,
      required: false,
      sequence: 1,
      config: {
        content:
          "Select your preferred videographer(s) from the options below. Review their portfolios to find the best fit for your brand's video content needs.",
      },
      conditions: [
        { conditionType: "service_signed", conditionServiceSlug: "videography" },
      ],
    },
    {
      pageNumber: 4,
      section: null,
      fieldLabel: "Select Videographer(s)",
      fieldType: "provider_picker",
      options: null,
      required: true,
      sequence: 2,
      config: { providerType: "videographer" },
      conditions: [
        { conditionType: "service_signed", conditionServiceSlug: "videography" },
      ],
    },

    // ── Page 5: Restaurant Details ──
    // Section: About Your Restaurant
    {
      pageNumber: 5,
      section: "About Your Restaurant",
      fieldLabel: "Restaurant Name",
      fieldType: "text",
      options: null,
      required: true,
      sequence: 1,
      config: null,
    },
    {
      pageNumber: 5,
      section: "About Your Restaurant",
      fieldLabel: "Website",
      fieldType: "text",
      options: null,
      required: false,
      sequence: 2,
      config: { placeholder: "https://..." },
    },
    {
      pageNumber: 5,
      section: "About Your Restaurant",
      fieldLabel: "Multiple Locations",
      fieldType: "textarea",
      options: null,
      required: false,
      sequence: 3,
      config: {
        placeholder:
          "If you have multiple locations, list them here with addresses",
      },
    },
    {
      pageNumber: 5,
      section: "About Your Restaurant",
      fieldLabel: "Opening Hours",
      fieldType: "matrix",
      options: null,
      required: false,
      sequence: 4,
      config: {
        rows: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
          "Public Holidays",
        ],
        columns: ["Times"],
      },
    },
    {
      pageNumber: 5,
      section: "About Your Restaurant",
      fieldLabel: "Social Media Inspiration",
      fieldType: "textarea",
      options: null,
      required: false,
      sequence: 5,
      config: {
        placeholder:
          "Share links to social media accounts or content that inspires the style you want for your brand",
      },
    },
    // Section: Brand Guidelines
    {
      pageNumber: 5,
      section: "Brand Guidelines",
      fieldLabel: "Current Menu",
      fieldType: "file",
      options: null,
      required: false,
      sequence: 6,
      config: null,
    },
    {
      pageNumber: 5,
      section: "Brand Guidelines",
      fieldLabel: "Main Logo",
      fieldType: "file",
      options: null,
      required: false,
      sequence: 7,
      config: null,
    },
    {
      pageNumber: 5,
      section: "Brand Guidelines",
      fieldLabel: "Other Logos",
      fieldType: "file",
      options: null,
      required: false,
      sequence: 8,
      config: null,
    },
    {
      pageNumber: 5,
      section: "Brand Guidelines",
      fieldLabel: "Brand Guide",
      fieldType: "file",
      options: null,
      required: false,
      sequence: 9,
      config: null,
    },
    {
      pageNumber: 5,
      section: "Brand Guidelines",
      fieldLabel: "Other Files",
      fieldType: "file",
      options: null,
      required: false,
      sequence: 10,
      config: null,
    },
    {
      pageNumber: 5,
      section: "Brand Guidelines",
      fieldLabel: "Company Fonts",
      fieldType: "text",
      options: null,
      required: false,
      sequence: 11,
      config: {
        placeholder: "e.g. Montserrat, Open Sans",
      },
    },
    // Section: Access Audit
    {
      ref: "fb_page_admin",
      pageNumber: 5,
      section: "Access Audit",
      fieldLabel: "Are you the admin of your Facebook Page?",
      fieldType: "radio",
      options: ["Yes", "No"],
      required: true,
      sequence: 12,
      config: null,
    },
    {
      pageNumber: 5,
      section: "Access Audit",
      fieldLabel: "Who is the Facebook Page admin?",
      fieldType: "text",
      options: null,
      required: false,
      sequence: 13,
      config: { placeholder: "Name and contact details of the admin" },
      conditions: [
        {
          conditionType: "answer_equals",
          conditionQuestionRef: "fb_page_admin",
          conditionValue: "No",
        },
      ],
    },
    {
      pageNumber: 5,
      section: "Access Audit",
      fieldLabel: "Do you know your Facebook login?",
      fieldType: "radio",
      options: ["Yes", "No"],
      required: true,
      sequence: 14,
      config: null,
    },
    {
      pageNumber: 5,
      section: "Access Audit",
      fieldLabel: "Facebook Account Type",
      fieldType: "text",
      options: null,
      required: false,
      sequence: 15,
      config: { placeholder: "Personal / Business" },
    },
    {
      ref: "ig_professional",
      pageNumber: 5,
      section: "Access Audit",
      fieldLabel: "Is your Instagram account Professional?",
      fieldType: "radio",
      options: ["Yes", "No", "Not sure"],
      required: true,
      sequence: 16,
      config: null,
    },
    {
      pageNumber: 5,
      section: "Access Audit",
      fieldLabel: "Is your Instagram linked to your Facebook Page?",
      fieldType: "radio",
      options: ["Yes", "No", "Not sure"],
      required: false,
      sequence: 17,
      config: null,
    },
    {
      pageNumber: 5,
      section: "Access Audit",
      fieldLabel: "Do you know your Instagram login?",
      fieldType: "radio",
      options: ["Yes", "No"],
      required: true,
      sequence: 18,
      config: null,
    },
    {
      pageNumber: 5,
      section: "Access Audit",
      fieldLabel: "Instagram Screenshots",
      fieldType: "file",
      options: null,
      required: false,
      sequence: 19,
      config: null,
    },
    {
      pageNumber: 5,
      section: "Access Audit",
      fieldLabel: "Instagram Username",
      fieldType: "text",
      options: null,
      required: false,
      sequence: 20,
      config: { placeholder: "@yourbusiness" },
    },
    {
      pageNumber: 5,
      section: "Access Audit",
      fieldLabel: "Instagram Password",
      fieldType: "static_content",
      options: null,
      required: false,
      sequence: 21,
      config: {
        content:
          "Please DO NOT share your password here. Have your Instagram login credentials ready for your onboarding call with your marketer. They will walk you through the access setup securely.",
      },
    },
    {
      pageNumber: 5,
      section: "Access Audit",
      fieldLabel: "Facebook Page Access",
      fieldType: "static_content",
      options: null,
      required: false,
      sequence: 22,
      config: {
        content:
          "To grant us admin access to your Facebook Page, please send an admin invitation to the email your marketer provides during the onboarding call. Instructions will be shared at that time.",
      },
    },
    {
      ref: "meta_business",
      pageNumber: 5,
      section: "Access Audit",
      fieldLabel: "Do you have a Meta Business Portfolio (Business Manager)?",
      fieldType: "radio",
      options: ["Yes", "No", "Not sure"],
      required: true,
      sequence: 23,
      config: null,
    },
    {
      pageNumber: 5,
      section: "Access Audit",
      fieldLabel: "Meta Business Portfolio",
      fieldType: "static_content",
      options: null,
      required: false,
      sequence: 24,
      config: {
        content:
          "If you have a Meta Business Portfolio, your marketer will guide you through granting partner access during your onboarding call. If you are not sure, don't worry — your marketer will help you check.",
      },
    },
    {
      pageNumber: 5,
      section: "Access Audit",
      fieldLabel: "TikTok Username",
      fieldType: "text",
      options: null,
      required: false,
      sequence: 25,
      config: { placeholder: "@yourbusiness" },
    },
    {
      pageNumber: 5,
      section: "Access Audit",
      fieldLabel: "TikTok Password",
      fieldType: "static_content",
      options: null,
      required: false,
      sequence: 26,
      config: {
        content:
          "Please DO NOT share your TikTok password here. Have your TikTok login credentials ready for your onboarding call. Your marketer will walk you through the access setup securely.",
      },
    },

    // ── Page 6: Completion ──
    {
      pageNumber: 6,
      section: null,
      fieldLabel: "You're All Set!",
      fieldType: "static_content",
      options: null,
      required: false,
      sequence: 1,
      config: {
        content:
          "Thank you for completing the intake form!\n\nNo payment is being taken today. Your dedicated marketer will review your responses and be in touch to schedule your onboarding call.\n\nDuring the onboarding call, they'll walk you through access setup, discuss your content strategy, and answer any questions you have.",
      },
    },
  ]

  // Clear existing intake data for idempotent seeding
  await db.delete(schema.intakeConditions)
  await db.delete(schema.intakeResponses)
  await db.delete(schema.intakeQuestions)
  console.log("  Cleared existing intake data")

  // Insert questions
  for (const q of questions) {
    const [row] = await db
      .insert(schema.intakeQuestions)
      .values({
        pageNumber: q.pageNumber,
        section: q.section,
        fieldLabel: q.fieldLabel,
        fieldType: q.fieldType as "text" | "textarea" | "email" | "phone" | "abn" | "address" | "radio" | "checkbox" | "multiselect" | "file" | "matrix" | "repeatable_group" | "provider_picker" | "static_content",
        options: q.options as Record<string, unknown> | null,
        required: q.required,
        sequence: q.sequence,
        config: q.config as Record<string, unknown> | null,
      })
      .returning({ id: schema.intakeQuestions.id })

    // Store ref for cross-question conditions
    if (q.ref) {
      questionRefs[q.ref] = row.id
    }

    // Insert conditions
    if (q.conditions) {
      for (const c of q.conditions) {
        const conditionValues: {
          questionId: string
          conditionType: "service_signed" | "venue_state" | "answer_equals"
          conditionServiceId?: string
          conditionQuestionId?: string
          conditionValue?: string
        } = {
          questionId: row.id,
          conditionType: c.conditionType,
        }

        if (c.conditionType === "service_signed" && c.conditionServiceSlug) {
          const serviceId = serviceBySlug[c.conditionServiceSlug]
          if (serviceId) {
            conditionValues.conditionServiceId = serviceId
          } else {
            console.warn(
              `  Warning: service slug "${c.conditionServiceSlug}" not found for condition on "${q.fieldLabel}"`
            )
            // Still insert the condition without the service ID
          }
        }

        if (c.conditionType === "answer_equals" && c.conditionQuestionRef) {
          const questionId = questionRefs[c.conditionQuestionRef]
          if (questionId) {
            conditionValues.conditionQuestionId = questionId
            conditionValues.conditionValue = c.conditionValue ?? undefined
          } else {
            console.warn(
              `  Warning: question ref "${c.conditionQuestionRef}" not found for condition on "${q.fieldLabel}"`
            )
          }
        }

        await db.insert(schema.intakeConditions).values(conditionValues)
      }
    }
  }

  console.log(`  Seeded ${questions.length} intake questions`)
  console.log("Intake seed complete.")
  await client.end()
}

seedIntake().catch((err) => {
  console.error("Intake seed failed:", err)
  process.exit(1)
})
