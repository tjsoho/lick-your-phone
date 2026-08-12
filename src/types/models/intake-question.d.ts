declare interface IntakeQuestion {
  id: string;
  page_number: number;
  section: string | null;
  field_label: string;
  field_type: string;
  options: string[] | null;
  required: boolean;
  sequence: number;
  config: Record<string, unknown> | null;
}

declare interface IntakeCondition {
  id: string;
  condition_type: "service_signed" | "answer_equals" | "venue_state";
  condition_service_id: string | null;
  condition_state_id: string | null;
  condition_question_id: string | null;
  condition_value: string | null;
}

declare interface IntakeQuestionWithConditions extends IntakeQuestion {
  intake_conditions: IntakeCondition[];
}

declare interface IntakeConditionInput extends Omit<IntakeCondition, "id"> {
  id?: string;
}
declare interface IntakeQuestionInput extends Omit<IntakeQuestion, "id"> {
  id?: string;
  intake_conditions?: IntakeConditionInput[];
}
