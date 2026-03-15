import { useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useCategoryStore, CATEGORY_COLORS } from '@/stores/categoryStore';
import { 
    Sheet, 
    SheetContent, 
    SheetHeader, 
    SheetTitle,
    SheetDescription
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    Plus, 
    ChevronRight, 
    Trash2, 
    Check, 
    X, 
    Tag,
    AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { useTranslation } from 'react-i18next';

export function CategoryManagementDrawer() {
    const { t } = useTranslation();
    const { isCategoryManagementOpen, closeCategoryManagement } = useUIStore();
    const { categories, addCategory, updateCategory, deleteCategory } = useCategoryStore();
    
    const [isAddingMode, setIsAddingMode] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
    const [migrateToId, setMigrateToId] = useState<string>('none');
    
    // For Color Picker
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [customColor, setCustomColor] = useState('#3b82f6');
    const [hue, setHue] = useState(210); // Default blue hue

    const handleAdd = async () => {
        if (!newCategoryName.trim()) return;
        await addCategory(newCategoryName.trim());
        setNewCategoryName('');
        setIsAddingMode(false);
    };

    const handleUpdate = async () => {
        if (editingCategory && editingCategory.name.trim()) {
            await updateCategory(editingCategory.id!, { 
                name: editingCategory.name.trim(),
                color: editingCategory.color 
            });
            setEditingCategory(null);
            setShowColorPicker(false);
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

    const handleColorSelect = (color: string) => {
        if (editingCategory) {
            setEditingCategory({ ...editingCategory, color });
        }
    };

    const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const h = parseInt(e.target.value);
        setHue(h);
        const color = `hsl(${h}, 70%, 50%)`;
        setCustomColor(color);
        if (editingCategory) {
            setEditingCategory({ ...editingCategory, color });
        }
    };

    return (
        <Sheet open={isCategoryManagementOpen} onOpenChange={(open) => !open && closeCategoryManagement()}>
            <SheetContent 
                side="bottom" 
                className="h-[90vh] rounded-t-[32px] p-0 border-t border-white/10 overflow-hidden flex flex-col bg-background/60 backdrop-blur-xl"
                style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.05), transparent)' }}
            >
                <div className="absolute top-0 left-0 right-0 h-32 opacity-5 blur-3xl pointer-events-none bg-white" />
                <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mt-4 mb-2 shrink-0" />
                
                <SheetHeader className="px-6 py-4 shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <SheetTitle className="text-2xl font-black tracking-tight">{t('categories')}</SheetTitle>
                            <SheetDescription className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
                                {categories.length} {t('totalCategories')}
                            </SheetDescription>
                        </div>
                        <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-10 w-10 rounded-full border-2 border-primary text-primary hover:bg-primary/10 hover:scale-[1.05] active:scale-[0.95] transition-all bg-transparent"
                            onClick={() => setIsAddingMode(true)}
                        >
                            <Plus className="w-5 h-5 stroke-[3]" />
                        </Button>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 pb-10">
                    {/* Add Mode */}
                    {isAddingMode && (
                        <div className="mb-6 p-4 rounded-3xl bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-top-4 duration-300">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-primary mb-3 block">{t('newCategoryName')}</Label>
                            <div className="flex gap-2">
                                <Input 
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder={t('categoryExample')}
                                    className="h-11 rounded-xl bg-background border-primary/20 focus:border-primary"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                                />
                                <Button onClick={handleAdd} className="h-11 px-4 rounded-xl font-bold">{t('add')}</Button>
                                <Button variant="ghost" size="icon" onClick={() => setIsAddingMode(false)} className="h-11 w-11 rounded-xl text-muted-foreground">
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Category List */}
                    <div className="space-y-3">
                        {categories.map((cat) => {
                            const isEditing = editingCategory?.id === cat.id;
                            
                            return (
                                <div key={cat.id} className="group">
                                    <div 
                                        className={cn(
                                            "flex flex-col transition-all duration-300 border rounded-[28px] overflow-hidden bg-card",
                                            isEditing ? "border-primary ring-4 ring-primary/5 shadow-xl" : "border-border/40 hover:border-primary/30"
                                        )}
                                    >
                                        <div 
                                            className="flex items-center justify-between p-4 cursor-pointer"
                                            onClick={() => {
                                                if (isEditing) {
                                                    setEditingCategory(null);
                                                    setShowColorPicker(false);
                                                } else {
                                                    setEditingCategory({ ...cat });
                                                    setShowColorPicker(false);
                                                }
                                            }}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div 
                                                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-black/5"
                                                    style={{ backgroundColor: isEditing && editingCategory ? editingCategory.color : cat.color }}
                                                >
                                                    <Tag className="w-5 h-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    {isEditing ? (
                                                        <input 
                                                            className="text-base font-black bg-transparent border-none p-0 focus:ring-0 w-32"
                                                            value={editingCategory?.name || ''}
                                                            onChange={(e) => editingCategory && setEditingCategory({ ...editingCategory, name: e.target.value })}
                                                            autoFocus
                                                            onClick={(e) => e.stopPropagation()}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                                                        />
                                                    ) : (
                                                        <span className="text-base font-black tracking-tight">{cat.name}</span>
                                                    )}
                                                    <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground opacity-60">
                                                        {cat.isDefault ? t('systemDefault') : `${t('categoryId')}: ${cat.id}`}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                {isEditing ? (
                                                    <div className="flex items-center gap-1">
                                                        <Button 
                                                            size="icon" 
                                                            variant="ghost" 
                                                            className="h-9 w-9 rounded-full text-green-600 hover:bg-green-50"
                                                            onClick={(e) => { e.stopPropagation(); handleUpdate(); }}
                                                        >
                                                            <Check className="w-5 h-5" />
                                                        </Button>
                                                        <Button 
                                                            size="icon" 
                                                            variant="ghost" 
                                                            className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/5"
                                                            onClick={(e) => { 
                                                                e.stopPropagation(); 
                                                                if (!cat.isDefault) setDeletingCategory(cat); 
                                                            }}
                                                            disabled={cat.isDefault}
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <ChevronRight className={cn(
                                                        "w-5 h-5 text-muted-foreground transition-all duration-300",
                                                        isEditing ? "rotate-90 text-primary" : "opacity-30 group-hover:opacity-100 group-hover:translate-x-0.5"
                                                    )} />
                                                )}
                                            </div>
                                        </div>

                                        {/* Edit Details Section */}
                                        {isEditing && (
                                            <div className="px-5 pb-6 pt-2 border-t border-dashed bg-muted/5 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <div className="space-y-4">
                                                    <div>
                                                        <div className="flex items-center justify-between mb-3">
                                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{t('chooseColor')}</Label>
                                                            <button 
                                                                onClick={() => setShowColorPicker(!showColorPicker)}
                                                                className={cn(
                                                                    "text-[10px] font-bold uppercase py-1 px-3 rounded-full transition-all",
                                                                    showColorPicker ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                                                                )}
                                                            >
                                                                {showColorPicker ? t('presets') : t('custom')}
                                                            </button>
                                                        </div>

                                                        {showColorPicker ? (
                                                            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                                                                <div className="flex items-center gap-3">
                                                                    <div 
                                                                        className="w-14 h-14 rounded-2xl shadow-inner border-2 border-white shrink-0"
                                                                        style={{ backgroundColor: customColor }}
                                                                    />
                                                                    <div className="flex-1 space-y-2">
                                                                        <div className="flex justify-between">
                                                                             <span className="text-[10px] font-bold text-muted-foreground">{t('adjustHue')}</span>
                                                                             <span className="text-[10px] font-black text-primary uppercase">{customColor}</span>
                                                                        </div>
                                                                        <input 
                                                                            type="range" 
                                                                            min="0" 
                                                                            max="360" 
                                                                            value={hue}
                                                                            onChange={handleHueChange}
                                                                            className="w-full h-2 rounded-full appearance-none cursor-pointer"
                                                                            style={{ 
                                                                                background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)' 
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-8 gap-2">
                                                                {CATEGORY_COLORS.map((color) => (
                                                                    <button
                                                                        key={color}
                                                                        type="button"
                                                                        onClick={() => handleColorSelect(color)}
                                                                        className={cn(
                                                                            "w-full aspect-square rounded-lg transition-transform active:scale-90 relative",
                                                                            editingCategory?.color === color && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110 z-10"
                                                                        )}
                                                                        style={{ backgroundColor: color }}
                                                                    >
                                                                        {editingCategory?.color === color && <Check className="w-3 h-3 text-white absolute inset-0 m-auto" />}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <Button 
                                                        className="w-full h-12 rounded-2xl font-black text-sm uppercase tracking-widest gap-2 shadow-lg shadow-primary/10"
                                                        onClick={handleUpdate}
                                                    >
                                                        {t('saveChanges')}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </SheetContent>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deletingCategory} onOpenChange={(open) => !open && setDeletingCategory(null)}>
                <AlertDialogContent className="w-[90%] rounded-[32px] p-8 border-none bg-background shadow-2xl">
                    <AlertDialogHeader className="space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mx-auto mb-2">
                            <Trash2 size={32} />
                        </div>
                        <AlertDialogTitle className="text-xl font-black text-center">{t('deleteCategoryQuestion', { name: deletingCategory?.name })}</AlertDialogTitle>
                        <AlertDialogDescription className="text-center text-xs font-medium text-muted-foreground leading-relaxed">
                            {t('deleteCategoryDescription')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="py-6 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('migrateExpensesTo')}</Label>
                            <Select value={migrateToId} onValueChange={setMigrateToId}>
                                <SelectTrigger className="h-12 rounded-xl border-muted/50 focus:border-primary">
                                    <SelectValue placeholder={t('moveToAnotherCategory')} />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl">
                                    <SelectItem value="none">{t('defaultUnlisted')}</SelectItem>
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
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 border border-muted/50">
                            <AlertCircle className="w-3.5 h-3.5 text-muted-foreground opacity-60" />
                            <p className="text-[10px] text-muted-foreground font-medium">
                                {migrateToId === 'none'
                                    ? t('migrateToUnlistedInfo')
                                    : t('migrateToSelectedInfo')
                                }
                            </p>
                        </div>
                    </div>

                    <AlertDialogFooter className="flex-col gap-3">
                        <AlertDialogAction onClick={handleDelete} className="h-12 rounded-2xl bg-destructive text-destructive-foreground font-bold text-sm shadow-lg shadow-destructive/20 active:scale-95 transition-all w-full">
                            {t('confirmDeletion')}
                        </AlertDialogAction>
                        <AlertDialogCancel className="h-12 rounded-2xl border-none bg-secondary/50 font-bold text-sm active:scale-95 transition-all w-full mt-0">
                            {t('cancel')}
                        </AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Sheet>
    );
}

function Label({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <label className={cn("text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}>
            {children}
        </label>
    );
}
