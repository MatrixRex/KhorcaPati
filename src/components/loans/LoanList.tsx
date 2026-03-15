import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { LoanCard } from './LoanCard';
import { useTranslation } from 'react-i18next';

export function LoanList() {
    const { t } = useTranslation();
    const loans = useLiveQuery(
        () => db.loans.orderBy('createdAt').reverse().toArray()
    );

    if (!loans) {
        return <div className="p-4 text-center text-muted-foreground">{t('loading')}</div>;
    }

    if (loans.length === 0) {
        return (
            <div className="p-8 text-center flex flex-col items-center justify-center">
                <div className="text-4xl mb-4">🤝</div>
                <h3 className="font-semibold text-lg">{t('noLoansYet')}</h3>
                <p className="text-muted-foreground text-sm">{t('loanSetupDescription')}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-[var(--item-gap)] pb-20">
            {loans.map((loan) => (
                <LoanCard
                    key={loan.id}
                    loan={loan}
                />
            ))}
        </div>
    );
}
