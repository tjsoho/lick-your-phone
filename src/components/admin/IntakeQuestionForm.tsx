"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check, ChevronDown, Loader2, Plus, Trash2 } from "lucide-react";
import {
  upsertQuestion,
  deleteQuestion,
} from "@/server-actions/intake-questions";
import { cn } from "@/lib/utils";

interface IntakeQuestionFormProps {
  question?: {
    id: string;
    page_number: number;
    section: string | null;
    field_label: string;
    field_type: string;
    options: string[] | null;
    required: boolean;
    sequence: number;
    config: Record<string, unknown> | null;
    intake_conditions?: {
      id?: string;
      condition_type: "service_signed" | "answer_equals" | "venue_state";
      condition_service_id?: string | null;
      condition_state_id?: string | null;
      condition_question_id?: string | null;
      condition_value?: string | null;
    }[];
  };
  services: { id: string; name: string }[];
  states: { id: string; name: string; code: string }[];
  questions: { id: string; field_label: string }[];
}

interface IntakeQuestionFormData {
  page_number: number;
  sequence: number;
  section: string;
  field_label: string;
  field_type: string;
  required: boolean;
  options: { value: string }[];
  config: {
    placeholder?: string;
    content?: string;
    providerType?: string;
  };
  conditions: {
    id?: string;
    condition_type: "service_signed" | "answer_equals" | "venue_state";
    condition_service_id: string;
    condition_state_id: string;
    condition_question_id: string;
    condition_value: string;
  }[];
}

const EASE = "ease-brand";

const inputClasses = `w-full rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] px-4 py-2.5 font-body text-[13px] text-lyp-black outline-none transition-all duration-500 ${EASE} placeholder:text-[#C3B5B5] focus:border-lyp-cherry/30 focus:bg-lyp-white focus:shadow-[0_0_0_4px_rgba(178,38,38,0.07)]`;

const selectClasses = `${inputClasses} appearance-none pr-11`;

const labelClasses =
  "mb-2 block font-body text-[10px] font-medium uppercase tracking-[0.22em] text-[#A89898]";

const errorClasses = "mt-1.5 font-body text-[12px] text-lyp-cherry";

const helperClasses = "font-body text-[12px] text-[#8A7A7A]";

const cardClasses =
  "rounded-2xl border border-[#EFE6E6] bg-lyp-white p-5 sm:p-6";

const sectionHeadingClasses =
  "font-heading text-[16px] font-bold tracking-[-0.02em] text-lyp-black";

const ghostAddClasses = `group inline-flex items-center gap-2 font-body text-[12px] font-semibold tracking-wide text-lyp-cherry transition-opacity duration-500 ${EASE} hover:opacity-70`;

const primaryPill = `group inline-flex items-center gap-3 rounded-full bg-lyp-cherry py-1.5 pl-6 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-white shadow-[0_10px_30px_-10px_rgba(178,38,38,0.5)] transition-all duration-500 ${EASE} hover:bg-[#c22e2e] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none`;

const destructivePill = `group inline-flex items-center gap-3 rounded-full border border-lyp-cherry/15 bg-lyp-cherry/[0.04] py-1.5 pl-6 pr-1.5 font-body text-[13px] font-semibold tracking-wide text-lyp-cherry transition-all duration-500 ${EASE} hover:border-lyp-cherry/25 hover:bg-lyp-cherry/[0.07] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50`;

const pillIcon = `flex h-8 w-8 items-center justify-center rounded-full bg-lyp-white/15 transition-transform duration-500 ${EASE} group-hover:scale-105`;

const destructivePillIcon = `flex h-8 w-8 items-center justify-center rounded-full bg-lyp-cherry/10 transition-transform duration-500 ${EASE} group-hover:scale-105`;

const iconButtonClasses = `flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[#A89898] transition-colors duration-500 ${EASE} hover:bg-lyp-cherry/[0.06] hover:text-lyp-cherry`;

/** Native selects need their own chevron once appearance is stripped. */
function SelectShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown
        strokeWidth={1.5}
        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A89898]"
      />
    </div>
  );
}

export default function IntakeQuestionForm({
  question,
  services,
  states,
  questions,
}: IntakeQuestionFormProps) {
  const router = useRouter();
  const isEditing = !!question;
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Convert raw options array to form field array format
  const initialOptions = Array.isArray(question?.options)
    ? question.options.map((opt) => ({ value: String(opt) }))
    : [];

  // Convert raw conditions to form format
  const initialConditions =
    question?.intake_conditions?.map((c) => ({
      id: c.id,
      condition_type: c.condition_type,
      condition_service_id: c.condition_service_id ?? "",
      condition_state_id: c.condition_state_id ?? "",
      condition_question_id: c.condition_question_id ?? "",
      condition_value: c.condition_value ?? "",
    })) ?? [];

  const configPlaceholder =
    question?.config &&
    typeof question.config === "object" &&
    "placeholder" in question.config
      ? String(question.config?.placeholder)
      : "";
  const configContent =
    question?.config &&
    typeof question.config === "object" &&
    "content" in question.config
      ? String(question.config?.content)
      : "";
  const configProviderType =
    question?.config &&
    typeof question.config === "object" &&
    "providerType" in question.config
      ? String(question.config?.providerType)
      : "photographer";

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<IntakeQuestionFormData>({
    defaultValues: {
      page_number: question?.page_number ?? 1,
      sequence: question?.sequence ?? 1,
      section: question?.section ?? "",
      field_label: question?.field_label ?? "",
      field_type:
        question?.field_type === "static"
          ? "static_content"
          : (question?.field_type ?? "text"),
      required: question?.required ?? false,
      options: initialOptions,
      config: {
        placeholder: configPlaceholder,
        content: configContent,
        providerType: configProviderType,
      },
      conditions: initialConditions,
    },
  });

  const {
    fields: optionFields,
    append: appendOption,
    remove: removeOption,
  } = useFieldArray({
    control,
    name: "options",
  });

  const {
    fields: conditionFields,
    append: appendCondition,
    remove: removeCondition,
  } = useFieldArray({
    control,
    name: "conditions",
  });

  const watchedFieldType = watch("field_type");
  const watchedConditions = watch("conditions");

  const isChoiceBased = ["radio", "checkbox", "multiselect", "select"].includes(
    watchedFieldType,
  );

  async function onSubmit(data: IntakeQuestionFormData) {
    setSaving(true);
    try {
      // Map options
      const optionsArray = isChoiceBased
        ? data.options.map((opt) => opt.value).filter(Boolean)
        : null;

      // Map conditions
      const conditions = data.conditions.map((c) => {
        const payload: IntakeQuestionFormData["conditions"][number] = {
          condition_type: c.condition_type,
          condition_service_id: "",
          condition_state_id: "",
          condition_question_id: "",
          condition_value: "",
        };
        if (c.id) payload.id = c.id;

        if (c.condition_type === "service_signed") {
          payload.condition_service_id = c.condition_service_id;
        } else if (c.condition_type === "venue_state") {
          payload.condition_state_id = c.condition_state_id;
        } else if (c.condition_type === "answer_equals") {
          payload.condition_question_id = c.condition_question_id;
          payload.condition_value = c.condition_value;
        }
        return payload;
      });

      // Map config based on field type
      let configPayload: Record<string, unknown> | null = null;
      if (data.field_type === "text" || data.field_type === "email") {
        configPayload = { placeholder: data.config?.placeholder || "" };
      } else if (data.field_type === "static_content") {
        configPayload = { content: data.config?.content || "" };
      } else if (data.field_type === "provider_picker") {
        configPayload = {
          providerType: data.config?.providerType || "photographer",
        };
      }

      const payload: IntakeQuestionInput = {
        id: question?.id,
        page_number: Number(data.page_number),
        sequence: Number(data.sequence),
        section: data.section || null,
        field_label: data.field_label,
        field_type: data.field_type,
        options: optionsArray,
        required: data.required,
        config: configPayload,
        intake_conditions: conditions,
      };

      const { error } = await upsertQuestion(payload);
      if (error) throw new Error(error);

      toast.success(isEditing ? "Question updated" : "Question created");
      router.push("/admin/intake-questions");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!question) return;
    if (
      !window.confirm(
        "Are you sure? All conditions for this question will also be deleted.",
      )
    )
      return;

    setDeleting(true);
    try {
      const { error } = await deleteQuestion(question.id);
      if (error) throw new Error(error);
      toast.success("Question deleted");
      router.push("/admin/intake-questions");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  // Filter out the current question from the list of options to prevent self-referencing conditions
  const otherQuestions = questions.filter((q) => q.id !== question?.id);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-3xl space-y-5"
    >
      {/* ─────────────── General information ─────────────── */}
      <section className={cn(cardClasses, "animate-rise")}>
        <h2 className={sectionHeadingClasses}>General Information</h2>

        <div className="mt-5 space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="page_number" className={labelClasses}>
                Page Number
              </label>
              <input
                id="page_number"
                type="number"
                min="1"
                {...register("page_number", {
                  required: "Page number is required",
                })}
                className={cn(inputClasses, "tabular-nums")}
              />
              {errors.page_number && (
                <p className={errorClasses}>{errors.page_number.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="sequence" className={labelClasses}>
                Sequence
              </label>
              <input
                id="sequence"
                type="number"
                min="1"
                {...register("sequence", { required: "Sequence is required" })}
                className={cn(inputClasses, "tabular-nums")}
              />
              {errors.sequence && (
                <p className={errorClasses}>{errors.sequence.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="section" className={labelClasses}>
              Section (Optional)
            </label>
            <input
              id="section"
              type="text"
              placeholder="e.g. Venue Details, Contact Info"
              {...register("section")}
              className={inputClasses}
            />
          </div>

          <div>
            <label htmlFor="field_label" className={labelClasses}>
              Field Label
            </label>
            <input
              id="field_label"
              type="text"
              placeholder="e.g. What is your ABN?"
              {...register("field_label", {
                required: "Field label is required",
              })}
              className={inputClasses}
            />
            {errors.field_label && (
              <p className={errorClasses}>{errors.field_label.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="field_type" className={labelClasses}>
                Field Type
              </label>
              <SelectShell>
                <select
                  id="field_type"
                  {...register("field_type", {
                    required: "Field type is required",
                  })}
                  className={selectClasses}
                >
                  <option value="text">Text Input</option>
                  <option value="textarea">Text Area</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="abn">ABN</option>
                  <option value="address">Address</option>
                  <option value="radio">Radio Options</option>
                  <option value="checkbox">Checkbox Options</option>
                  <option value="multiselect">Multiselect Dropdown</option>
                  <option value="file">File Upload</option>
                  <option value="matrix">Matrix Grid</option>
                  <option value="repeatable_group">Repeatable Group</option>
                  <option value="provider_picker">Provider Picker</option>
                  <option value="static_content">Static Content</option>
                </select>
              </SelectShell>
            </div>

            <label
              htmlFor="required"
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] px-4 py-2.5 transition-all duration-500 ${EASE} hover:border-lyp-cherry/25`}
            >
              <input
                id="required"
                type="checkbox"
                {...register("required")}
                className="h-4 w-4 flex-shrink-0 rounded accent-lyp-cherry"
              />
              <span className="select-none font-body text-[13px] font-medium text-lyp-black">
                Required field
              </span>
            </label>
          </div>

          {(watchedFieldType === "text" || watchedFieldType === "email") && (
            <div className="border-t border-[#F1E8E8] pt-5">
              <label htmlFor="config.placeholder" className={labelClasses}>
                Placeholder Text
              </label>
              <input
                id="config.placeholder"
                type="text"
                placeholder={
                  watchedFieldType === "text"
                    ? "e.g. @yourbusiness"
                    : "e.g. your@email.com"
                }
                {...register("config.placeholder")}
                className={inputClasses}
              />
            </div>
          )}

          {watchedFieldType === "static_content" && (
            <div className="border-t border-[#F1E8E8] pt-5">
              <label htmlFor="config.content" className={labelClasses}>
                Static Content
              </label>
              <textarea
                id="config.content"
                rows={4}
                placeholder="Enter the static content to display to the user..."
                {...register("config.content", {
                  required:
                    "Static content is required for Static Content fields",
                })}
                className={inputClasses}
              />
              {errors.config?.content && (
                <p className={errorClasses}>{errors.config.content.message}</p>
              )}
            </div>
          )}

          {watchedFieldType === "provider_picker" && (
            <div className="border-t border-[#F1E8E8] pt-5">
              <label htmlFor="config.providerType" className={labelClasses}>
                Provider Type
              </label>
              <SelectShell>
                <select
                  id="config.providerType"
                  {...register("config.providerType")}
                  className={selectClasses}
                >
                  <option value="photographer">Photographer</option>
                  <option value="videographer">Videographer</option>
                </select>
              </SelectShell>
            </div>
          )}
        </div>
      </section>

      {/* ─────────────── Choice options array builder ─────────────── */}
      {isChoiceBased && (
        <section
          className={cn(cardClasses, "animate-rise")}
          style={{ animationDelay: "80ms" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className={sectionHeadingClasses}>Options</h2>
            <button
              type="button"
              onClick={() => appendOption({ value: "" })}
              className={ghostAddClasses}
            >
              Add Option
              <Plus strokeWidth={1.5} className="h-3.5 w-3.5" />
            </button>
          </div>

          {optionFields.length === 0 ? (
            <p className={cn(helperClasses, "mt-4")}>
              No options added yet. Choice-based types need at least one option.
            </p>
          ) : (
            <div className="mt-4 space-y-2.5">
              {optionFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2.5">
                  <span className="w-6 flex-shrink-0 font-body text-[11px] tabular-nums text-[#A89898]">
                    #{index + 1}
                  </span>
                  <input
                    type="text"
                    aria-label={`Option ${index + 1}`}
                    placeholder={`Option ${index + 1}`}
                    {...register(`options.${index}.value` as const, {
                      required: "Option text is required",
                    })}
                    className={inputClasses}
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    className={iconButtonClasses}
                    title="Remove option"
                    aria-label={`Remove option ${index + 1}`}
                  >
                    <Trash2 strokeWidth={1.5} className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ─────────────── Visibility conditions builder ─────────────── */}
      <section
        className={cn(cardClasses, "animate-rise")}
        style={{ animationDelay: "140ms" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={sectionHeadingClasses}>Visibility Conditions</h2>
            <p className={cn(helperClasses, "mt-1.5")}>
              OR logic if multiple conditions.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              appendCondition({
                condition_type: "service_signed",
                condition_service_id: "",
                condition_state_id: "",
                condition_question_id: "",
                condition_value: "",
              })
            }
            className={ghostAddClasses}
          >
            Add Condition
            <Plus strokeWidth={1.5} className="h-3.5 w-3.5" />
          </button>
        </div>

        {conditionFields.length === 0 ? (
          <p className={cn(helperClasses, "mt-4")}>
            Visible to all clients by default. Add conditions to show/hide based
            on details or responses.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {conditionFields.map((field, index) => {
              const currentType = watchedConditions?.[index]?.condition_type;
              return (
                <div
                  key={field.id}
                  className="relative rounded-2xl border border-[#EFE6E6] bg-[#FBF8F8] p-4 sm:p-5"
                >
                  <button
                    type="button"
                    onClick={() => removeCondition(index)}
                    className={cn(iconButtonClasses, "absolute right-3 top-3")}
                    title="Remove condition"
                    aria-label={`Remove condition ${index + 1}`}
                  >
                    <Trash2 strokeWidth={1.5} className="h-4 w-4" />
                  </button>

                  <div className="grid grid-cols-1 gap-4 pr-10 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor={`condition-${index}-type`}
                        className={labelClasses}
                      >
                        Condition Type
                      </label>
                      <SelectShell>
                        <select
                          id={`condition-${index}-type`}
                          {...register(
                            `conditions.${index}.condition_type` as const,
                          )}
                          className={cn(selectClasses, "bg-lyp-white")}
                        >
                          <option value="service_signed">Service Signed</option>
                          <option value="venue_state">Venue State</option>
                          <option value="answer_equals">Answer Equals</option>
                        </select>
                      </SelectShell>
                    </div>

                    {currentType === "service_signed" && (
                      <div>
                        <label
                          htmlFor={`condition-${index}-service`}
                          className={labelClasses}
                        >
                          Select Service
                        </label>
                        <SelectShell>
                          <select
                            id={`condition-${index}-service`}
                            {...register(
                              `conditions.${index}.condition_service_id` as const,
                              {
                                required: "Service is required",
                              },
                            )}
                            className={cn(selectClasses, "bg-lyp-white")}
                          >
                            <option value="">Choose Service...</option>
                            {services.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </SelectShell>
                      </div>
                    )}

                    {currentType === "venue_state" && (
                      <div>
                        <label
                          htmlFor={`condition-${index}-state`}
                          className={labelClasses}
                        >
                          Select State
                        </label>
                        <SelectShell>
                          <select
                            id={`condition-${index}-state`}
                            {...register(
                              `conditions.${index}.condition_state_id` as const,
                              {
                                required: "State is required",
                              },
                            )}
                            className={cn(selectClasses, "bg-lyp-white")}
                          >
                            <option value="">Choose State...</option>
                            {states.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.code})
                              </option>
                            ))}
                          </select>
                        </SelectShell>
                      </div>
                    )}

                    {currentType === "answer_equals" && (
                      <>
                        <div>
                          <label
                            htmlFor={`condition-${index}-question`}
                            className={labelClasses}
                          >
                            Select Question
                          </label>
                          <SelectShell>
                            <select
                              id={`condition-${index}-question`}
                              {...register(
                                `conditions.${index}.condition_question_id` as const,
                                {
                                  required: "Question is required",
                                },
                              )}
                              className={cn(selectClasses, "bg-lyp-white")}
                            >
                              <option value="">Choose Question...</option>
                              {otherQuestions.map((q) => (
                                <option key={q.id} value={q.id}>
                                  {q.field_label}
                                </option>
                              ))}
                            </select>
                          </SelectShell>
                        </div>
                        <div>
                          <label
                            htmlFor={`condition-${index}-value`}
                            className={labelClasses}
                          >
                            Expected Answer Value
                          </label>
                          <input
                            id={`condition-${index}-value`}
                            type="text"
                            placeholder="e.g. Yes, No, 12"
                            {...register(
                              `conditions.${index}.condition_value` as const,
                              {
                                required: "Value is required",
                              },
                            )}
                            className={cn(inputClasses, "bg-lyp-white")}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─────────────── Form buttons ─────────────── */}
      <div
        className="animate-rise flex flex-wrap items-center gap-3"
        style={{ animationDelay: "200ms" }}
      >
        <button type="submit" disabled={saving} className={primaryPill}>
          {saving
            ? "Saving..."
            : isEditing
              ? "Update Question"
              : "Create Question"}
          <span className={pillIcon}>
            {saving ? (
              <Loader2 strokeWidth={1.5} className="h-4 w-4 animate-spin" />
            ) : (
              <Check strokeWidth={1.5} className="h-4 w-4" />
            )}
          </span>
        </button>

        {isEditing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className={destructivePill}
          >
            {deleting ? "Deleting..." : "Delete Question"}
            <span className={destructivePillIcon}>
              {deleting ? (
                <Loader2 strokeWidth={1.5} className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 strokeWidth={1.5} className="h-4 w-4" />
              )}
            </span>
          </button>
        )}
      </div>
    </form>
  );
}
