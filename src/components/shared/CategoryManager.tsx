import { useState } from 'react';
import { Pencil, Trash2, Check, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCategoryStore } from '@/stores/categoryStore';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { Category } from '@/db/schema';

export function CategoryManager() {
    const { categories, updateCategory, deleteCategory } = useCategoryStore();
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
    const [migrateToId, setMigrateToId] = useState<string>('none');

    const handleStartEdit = (cat: Category) => {
        setEditingId(cat.id!);
        setEditName(cat.name);
    };

    const handleSaveEdit = async () => {
        if (editingId && editName.trim()) {
            await updateCategory(editingId, { name: editName.trim() });
            setEditingId(null);
        }
    };

    const handleDelete = async () => {
        if (deletingCategory?.id) {
            const migrateId = migrateToId === 'none' ? undefined : parseInt(migrateToId);
            await deleteCategory(deletingCategory.id, migrateId);
            setDeletingCategory(null);
            setMigrateToId('none');
        }
    };

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold">Categories</h2>
            <div className="space-y-2">
                {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                        {editingId === cat.id ? (
                            <div className="flex items-center gap-2 flex-1">
                                <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="h-8"
                                    autoFocus
                                />
                                <Button size="icon" variant="ghost" onClick={handleSaveEdit} className="h-8 w-8 text-green-600">
                                    <Check className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} className="h-8 w-8 text-destructive">
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                                    <span className="font-medium">{cat.name}</span>
                                    {cat.isDefault && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">Default</span>}
                                </div>
                                <div className="flex gap-1">
                                    <Button size="icon" variant="ghost" onClick={() => handleStartEdit(cat)} className="h-8 w-8">
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    {!cat.isDefault && (
                                        <Button size="icon" variant="ghost" onClick={() => setDeletingCategory(cat)} className="h-8 w-8 text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>

            <AlertDialog open={!!deletingCategory} onOpenChange={(open) => !open && setDeletingCategory(null)}>
                <AlertDialogContent className="w-[90%] rounded-xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Category</AlertDialogTitle>
                        <AlertDialogDescription>
                            What should happen to the expenses in "{deletingCategory?.name}"?
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Migrate to (Optional)</label>
                            <Select value={migrateToId} onValueChange={setMigrateToId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Default (Unsorted)</SelectItem>
                                    {categories
                                        .filter(c => c.id !== deletingCategory?.id)
                                        .map(c => (
                                            <SelectItem key={c.id} value={c.id!.toString()}>
                                                {c.name}
                                            </SelectItem>
                                        ))
                                    }
                                </SelectContent>
                            </Select>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {migrateToId === 'none'
                                ? "All expenses will be moved to the 'Unsorted' category."
                                : `All expenses will be moved to the selected category.`
                            }
                        </p>
                    </div>

                    <AlertDialogFooter className="flex-row gap-2">
                        <AlertDialogCancel className="flex-1 mt-0">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
