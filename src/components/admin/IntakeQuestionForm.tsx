"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Trash2, GripVertical } from "lucide-react";
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
    options: any;
    required: boolean;
    sequence: number;
    config: any;
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

const inputClasses =
  "w-full border border-gray-300 rounded-md px-3 py-2 font-body text-sm text-lyp-black focus:outline-none focus:ring-2 focus:ring-lyp-cherry focus:border-transparent";

const labelClasses =
  "block font-heading text-sm font-semibold text-lyp-black mb-1";

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
      ? String((question.config as any).placeholder)
      : "";
  const configContent =
    question?.config &&
    typeof question.config === "object" &&
    "content" in question.config
      ? String((question.config as any).content)
      : "";
  const configProviderType =
    question?.config &&
    typeof question.config === "object" &&
    "providerType" in question.config
      ? String((question.config as any).providerType)
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
        const payload: any = {
          condition_type: c.condition_type,
        };
        if (c.id) payload.id = c.id;

        if (c.condition_type === "service_signed") {
          payload.condition_service_id = c.condition_service_id || null;
        } else if (c.condition_type === "venue_state") {
          payload.condition_state_id = c.condition_state_id || null;
        } else if (c.condition_type === "answer_equals") {
          payload.condition_question_id = c.condition_question_id || null;
          payload.condition_value = c.condition_value || null;
        }
        return payload;
      });

      // Map config based on field type
      let configPayload: any = null;
      if (data.field_type === "text" || data.field_type === "email") {
        configPayload = { placeholder: data.config?.placeholder || "" };
      } else if (data.field_type === "static_content") {
        configPayload = { content: data.config?.content || "" };
      } else if (data.field_type === "provider_picker") {
        configPayload = {
          providerType: data.config?.providerType || "photographer",
        };
      }

      const payload = {
        id: question?.id,
        page_number: Number(data.page_number),
        sequence: Number(data.sequence),
        section: data.section || null,
        field_label: data.field_label,
        field_type: data.field_type,
        options: optionsArray,
        required: data.required,
        config: configPayload,
        conditions,
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="font-heading text-lg font-bold text-lyp-black">
          General Information
        </h2>

        <div className="grid grid-cols-2 gap-4">
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
              className={inputClasses}
            />
            {errors.page_number && (
              <p className="text-red-600 text-xs mt-1">
                {errors.page_number.message}
              </p>
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
              className={inputClasses}
            />
            {errors.sequence && (
              <p className="text-red-600 text-xs mt-1">
                {errors.sequence.message}
              </p>
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
            <p className="text-red-600 text-xs mt-1">
              {errors.field_label.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 items-end">
          <div>
            <label htmlFor="field_type" className={labelClasses}>
              Field Type
            </label>
            <select
              id="field_type"
              {...register("field_type", {
                required: "Field type is required",
              })}
              className={inputClasses}
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
          </div>

          <div className="flex items-center h-10 gap-2">
            <input
              id="required"
              type="checkbox"
              {...register("required")}
              className="rounded border-gray-300 text-lyp-cherry focus:ring-lyp-cherry h-4 w-4"
            />
            <label
              htmlFor="required"
              className="font-body text-sm font-semibold text-lyp-black select-none"
            >
              Required field
            </label>
          </div>
        </div>

        {(watchedFieldType === "text" || watchedFieldType === "email") && (
          <div className="border-t pt-4">
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
          <div className="border-t pt-4">
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
              <p className="text-red-600 text-xs mt-1">
                {errors.config.content.message}
              </p>
            )}
          </div>
        )}

        {watchedFieldType === "provider_picker" && (
          <div className="border-t pt-4">
            <label htmlFor="config.providerType" className={labelClasses}>
              Provider Type
            </label>
            <select
              id="config.providerType"
              {...register("config.providerType")}
              className={inputClasses}
            >
              <option value="photographer">Photographer</option>
              <option value="videographer">Videographer</option>
            </select>
          </div>
        )}
      </div>

      {/* Choice options array builder */}
      {isChoiceBased && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-lyp-black">
              Options
            </h2>
            <button
              type="button"
              onClick={() => appendOption({ value: "" })}
              className="flex items-center gap-1 text-sm font-body text-lyp-cherry hover:text-lyp-maroon transition-colors"
            >
              <Plus className="h-4 w-4" /> Add Option
            </button>
          </div>

          {optionFields.length === 0 ? (
            <p className="font-body text-sm text-gray-500">
              No options added yet. Choice-based types need at least one option.
            </p>
          ) : (
            <div className="space-y-2">
              {optionFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <span className="font-body text-xs text-gray-400 w-6">
                    #{index + 1}
                  </span>
                  <input
                    type="text"
                    placeholder={`Option ${index + 1}`}
                    {...register(`options.${index}.value` as const, {
                      required: "Option text is required",
                    })}
                    className={inputClasses}
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    className="text-red-500 hover:text-red-700 p-2 font-body text-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Visibility Conditions builder */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-lyp-black">
            Visibility Conditions (OR Logic if multiple conditions)
          </h2>
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
            className="flex items-center gap-1 text-sm font-body text-lyp-cherry hover:text-lyp-maroon transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Condition
          </button>
        </div>

        {conditionFields.length === 0 ? (
          <p className="font-body text-sm text-gray-500">
            Visible to all clients by default. Add conditions to show/hide based
            on details or responses.
          </p>
        ) : (
          <div className="space-y-4">
            {conditionFields.map((field, index) => {
              const currentType = watchedConditions?.[index]?.condition_type;
              return (
                <div
                  key={field.id}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3 relative"
                >
                  <button
                    type="button"
                    onClick={() => removeCondition(index)}
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1.5"
                    title="Remove condition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                    <div>
                      <label className="block font-heading text-xs font-semibold text-lyp-black mb-1">
                        Condition Type
                      </label>
                      <select
                        {...register(
                          `conditions.${index}.condition_type` as const,
                        )}
                        className={inputClasses}
                      >
                        <option value="service_signed">Service Signed</option>
                        <option value="venue_state">Venue State</option>
                        <option value="answer_equals">Answer Equals</option>
                      </select>
                    </div>

                    {currentType === "service_signed" && (
                      <div>
                        <label className="block font-heading text-xs font-semibold text-lyp-black mb-1">
                          Select Service
                        </label>
                        <select
                          {...register(
                            `conditions.${index}.condition_service_id` as const,
                            {
                              required: "Service is required",
                            },
                          )}
                          className={inputClasses}
                        >
                          <option value="">Choose Service...</option>
                          {services.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {currentType === "venue_state" && (
                      <div>
                        <label className="block font-heading text-xs font-semibold text-lyp-black mb-1">
                          Select State
                        </label>
                        <select
                          {...register(
                            `conditions.${index}.condition_state_id` as const,
                            {
                              required: "State is required",
                            },
                          )}
                          className={inputClasses}
                        >
                          <option value="">Choose State...</option>
                          {states.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.code})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {currentType === "answer_equals" && (
                      <>
                        <div>
                          <label className="block font-heading text-xs font-semibold text-lyp-black mb-1">
                            Select Question
                          </label>
                          <select
                            {...register(
                              `conditions.${index}.condition_question_id` as const,
                              {
                                required: "Question is required",
                              },
                            )}
                            className={inputClasses}
                          >
                            <option value="">Choose Question...</option>
                            {otherQuestions.map((q) => (
                              <option key={q.id} value={q.id}>
                                {q.field_label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block font-heading text-xs font-semibold text-lyp-black mb-1">
                            Expected Answer Value
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Yes, No, 12"
                            {...register(
                              `conditions.${index}.condition_value` as const,
                              {
                                required: "Value is required",
                              },
                            )}
                            className={inputClasses}
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
      </div>

      {/* Form Buttons */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className={cn(
            "bg-lyp-cherry text-white px-6 py-2 rounded-md font-body text-sm hover:bg-lyp-maroon transition-colors",
            saving && "opacity-50 cursor-not-allowed",
          )}
        >
          {saving
            ? "Saving..."
            : isEditing
              ? "Update Question"
              : "Create Question"}
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className={cn(
              "bg-red-600 text-white px-6 py-2 rounded-md font-body text-sm hover:bg-red-700 transition-colors",
              deleting && "opacity-50 cursor-not-allowed",
            )}
          >
            {deleting ? "Deleting..." : "Delete Question"}
          </button>
        )}
      </div>
    </form>
  );
}
