"use client";

type StepperProps = {
  current: number;
  steps: string[];
};

export default function Stepper({ current, steps }: StepperProps) {
  return (
    <div className="mb-6 overflow-x-auto">
      <div className="flex items-center gap-1 min-w-max">
        {steps.map((label, index) => {
          const isActive = index === current;
          const isDone = index < current;
          return (
            <div
              key={label}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isDone
                  ? "bg-status-completed/15 text-status-completed"
                  : isActive
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                isDone
                  ? "bg-status-completed text-white"
                  : isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted-foreground/20 text-muted-foreground"
              }`}>
                {isDone ? "\u2713" : index + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
