import * as React from "react";
import { SuggestionInput } from "./SuggestionInput";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/schema";

interface GoalComboBoxProps {
    value: number | null;
    onChange: (value: number | null) => void;
    onBlur?: () => void;
    onEnter?: () => void;
}

export const GoalComboBox = React.forwardRef<HTMLInputElement, GoalComboBoxProps>(
    ({ value, onChange, onBlur, onEnter }, ref) => {
        const goals = useLiveQuery(() => db.goals.toArray()) || [];

        const goalNames = React.useMemo(() => {
            return goals.map(g => g.title);
        }, [goals]);

        const selectedGoal = React.useMemo(() => {
            return goals.find(g => g.id === value);
        }, [goals, value]);

        const handleSelect = (selected: string) => {
            const goal = goals.find(g => g.title === selected);
            if (goal) {
                onChange(goal.id!);
            } else {
                onChange(null);
            }
            setTimeout(() => onEnter?.(), 100);
        };

        return (
            <SuggestionInput
                ref={ref}
                type="category" // reusing category icon for now or we can add "goal" to SuggestionInput
                isMulti={false}
                value={selectedGoal?.title || ""}
                customSuggestions={goalNames}
                onChange={(val) => {
                    if (!val) onChange(null);
                }}
                onBlur={onBlur}
                onSelectSuggestion={handleSelect}
                onEnter={() => {
                   onEnter?.();
                }}
                placeholder={goals.length > 0 ? "Select goal..." : "No goals yet"}
                className="h-12 rounded-xl"
            />
        );
    }
);
