export interface FieldProps {
  question: IntakeQuestionWithConditions;
  value: unknown;
  onChange: (value: unknown) => void;
  providers?: Provider[];
  /**
   * The answers are submitted and the form is being read back, not filled in.
   *
   * Every native control is already inert — the form wraps its fields in a
   * disabled fieldset — so a field only needs this when it has an affordance
   * the browser can't disable for it, like a drag-and-drop target.
   */
  disabled?: boolean;
}
