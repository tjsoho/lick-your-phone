"use client";

import { createContext, useContext, type ReactNode } from "react";

interface IntakeContextValue {
  intakeQuestions: IntakeQuestion[];
  intakeProviders: Provider[];
  intakeResponses: Record<string, unknown>;
}

const IntakeContext = createContext<IntakeContextValue | null>(null);

const EMPTY: IntakeContextValue = {
  intakeQuestions: [],
  intakeProviders: [],
  intakeResponses: {},
};

export function useIntake(): IntakeContextValue {
  const ctx = useContext(IntakeContext);
  return ctx ?? EMPTY;
}

interface IntakeProviderProps {
  questions: IntakeQuestion[];
  providers: Provider[];
  responses: Record<string, unknown>;
  children: ReactNode;
}

export function IntakeProvider({
  questions,
  providers,
  responses,
  children,
}: IntakeProviderProps) {
  return (
    <IntakeContext.Provider
      value={{
        intakeQuestions: questions,
        intakeProviders: providers,
        intakeResponses: responses,
      }}
    >
      {children}
    </IntakeContext.Provider>
  );
}
