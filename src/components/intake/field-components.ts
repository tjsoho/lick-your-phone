import TextField from "./TextField";
import TextareaField from "./TextareaField";
import EmailField from "./EmailField";
import PhoneField from "./PhoneField";
import AbnField from "./AbnField";
import AddressField from "./AddressField";
import RadioField from "./RadioField";
import CheckboxField from "./CheckboxField";
import MultiselectField from "./MultiselectField";
import FileField from "./FileField";
import MatrixField from "./MatrixField";
import RepeatableGroupField from "./RepeatableGroupField";
import ProviderPickerField from "./ProviderPickerField";
import StaticContentField from "./StaticContentField";
import type { FieldProps } from "./types";

/**
 * Field type to the control the client is actually given.
 *
 * It sits here rather than inside the onboarding form because the dashboard
 * draws the same controls in two previews now: one question beside the
 * question editor, and the whole form as a client sees it. One map, so a new
 * field type reaches all three at once and no preview can quietly show a
 * control the client will never get.
 *
 * Imported from each file rather than through the barrel, so the barrel can
 * re-export this map without the two importing each other.
 */
export const FIELD_COMPONENTS: Record<
  string,
  React.ComponentType<FieldProps>
> = {
  text: TextField,
  textarea: TextareaField,
  email: EmailField,
  phone: PhoneField,
  abn: AbnField,
  address: AddressField,
  radio: RadioField,
  checkbox: CheckboxField,
  multiselect: MultiselectField,
  file: FileField,
  matrix: MatrixField,
  repeatable_group: RepeatableGroupField,
  provider_picker: ProviderPickerField,
  static_content: StaticContentField,
};
