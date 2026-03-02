import { CategoryManager } from '@/components/shared/CategoryManager';

export default function Settings() {
    return (
        <div className="p-4 space-y-4">
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <div className="pt-4">
                <CategoryManager />
            </div>
        </div>
    );
}
