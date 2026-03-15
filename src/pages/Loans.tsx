import { LoanList } from '@/components/loans/LoanList';
import { useUIStore } from '@/stores/uiStore';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageContainer } from '@/components/shared/PageContainer';

export default function Loans() {
    const { t } = useTranslation();
    const openAddLoan = useUIStore((state) => state.openAddLoan);

    return (
        <PageContainer
            title={t('loans')}
            showBackButton
            headerAction={
                <Button size="sm" onClick={openAddLoan} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md">
                    <Plus className="w-4 h-4 mr-1" /> {t('add')}
                </Button>
            }
        >
            <div className="flex-1">
                <LoanList />
            </div>
        </PageContainer>
    );
}
