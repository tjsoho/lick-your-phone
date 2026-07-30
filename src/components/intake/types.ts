import type { IntakeQuestion, Provider } from "@/server-actions/intake"

export interface FieldProps {
  question: IntakeQuestion
  value: unknown
  onChange: (value: unknown) => void
  providers?: Provider[]
}
