import { CategoryManager } from '@/components/shared/CategoryManager';
import { PageContainer } from '@/components/shared/PageContainer';

export default function Settings() {
    return (
        <PageContainer title="Settings">
            <div className="pt-2">
                <CategoryManager />
            </div>
        </PageContainer>
    );
}
