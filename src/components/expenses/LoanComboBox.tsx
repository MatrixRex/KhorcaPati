import * as React from "react";
import { SuggestionInput } from "./SuggestionInput";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/schema";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";


interface LoanComboBoxProps {
    value: number | null;
    onChange: (value: number | null) => void;
    onBlur?: () => void;
    onEnter?: () => void;
    placeholder?: string;
}


export const LoanComboBox = React.forwardRef<HTMLInputElement, LoanComboBoxProps>(
    ({ value, onChange, onBlur, onEnter, placeholder }, ref) => {

        const { t } = useTranslation();
        const loans = useLiveQuery(() => db.loans.toArray()) || [];

        const loanNames = React.useMemo(() => {
            return loans.map(l => `${l.title} (${l.person})`);
        }, [loans]);

        const selectedLoan = React.useMemo(() => {
            return loans.find(l => l.id === value);
        }, [loans, value]);

        const handleSelect = (selected: string) => {
            const loan = loans.find(l => `${l.title} (${l.person})` === selected);
            if (loan) {
                onChange(loan.id!);
            } else {
                onChange(null);
            }
            setTimeout(() => onEnter?.(), 100);
        };

        const getItemIcon = (suggestion: string) => {
            const loan = loans.find(l => `${l.title} (${l.person})` === suggestion);
            if (!loan) return null;
            return loan.type === 'given' 
                ? <ArrowUpRight className="w-3.5 h-3.5" /> 
                : <ArrowDownLeft className="w-3.5 h-3.5" />;
        };

        return (
            <SuggestionInput
                ref={ref}
                type="category"
                isMulti={false}
                value={selectedLoan ? `${selectedLoan.title} (${selectedLoan.person})` : ""}
                customSuggestions={loanNames}
                onChange={(val) => {
                    if (!val) onChange(null);
                }}
                onBlur={onBlur}
                onSelectSuggestion={handleSelect}
                getItemIcon={getItemIcon}
                onEnter={() => {
                   onEnter?.();
                }}
                placeholder={placeholder || t('noLoanLink')}
                className="h-12 rounded-xl"

            />
        );
    }
);
