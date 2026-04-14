'use client';

import { cn } from '@/lib/utils';

export type WorkflowStep = 1 | 2 | 3 | 4;

export interface WorkflowStepMeta {
  step: WorkflowStep;
  label: string;
  icon: string;
}

interface WorkflowStepBarProps {
  steps: WorkflowStepMeta[];
  currentStep: WorkflowStep;
  onStepChange: (step: WorkflowStep) => void;
}

export function WorkflowStepBar({ steps, currentStep, onStepChange }: WorkflowStepBarProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg">
      {steps.map(({ step, label, icon }) => (
        <button
          key={step}
          onClick={() => onStepChange(step)}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-colors',
            currentStep === step
              ? 'bg-primary text-primary-foreground shadow-sm'
              : currentStep > step
                ? 'text-green-500 hover:bg-accent'
                : 'text-muted-foreground hover:bg-accent'
          )}
        >
          <span>{currentStep > step ? '✓' : icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
