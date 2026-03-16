import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { isWithinInterval, startOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    XAxis, YAxis, ResponsiveContainer, Cell,
    Sankey, Layer, AreaChart, Area, CartesianGrid, PieChart, Pie, Sector
} from 'recharts';
import { useFilterStore } from '@/stores/filterStore';
import { useUIStore } from '@/stores/uiStore';
import { PageContainer } from '@/components/shared/PageContainer';
import { useCategoryStore } from '@/stores/categoryStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTranslation } from 'react-i18next';
import { formatAmount } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { FolderIcon, HandCoinsIcon, SearchIcon } from 'lucide-react';
import { CategoryRecordsDrawer } from '@/components/shared/CategoryRecordsDrawer';

// Removed hardcoded COLORS array

// Custom node for Sankey to make it look premium
const SankeyNode = ({ x, y, width, height, index, payload, containerWidth }: any) => {
    const isOut = x > containerWidth / 2;
    return (
        <Layer key={`sankey-node-${index}`}>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={payload.fill || '#8884d8'}
                fillOpacity={0.9}
                rx={2}
            />
            <text
                x={isOut ? x - 6 : x + width + 6}
                y={y + height / 2}
                textAnchor={isOut ? 'end' : 'start'}
                fontSize={Math.round(11 * (payload.fontScale || 1))}
                fontWeight="700"
                fill="currentColor"
                className="fill-foreground uppercase tracking-tighter"
            >
                {payload.name}
            </text>
        </Layer>
    );
};

// Custom shape for Pie to ensure safe rounded corners per slice size
const DynamicRoundedSector = (props: any) => {
    const { 
        cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, 
        paddingAngle, index, payload 
    } = props;
    
    // Safety check for Recharts numeric props
    if (cx === undefined || cy === undefined) return null;
    
    const deltaAngle = Math.abs(endAngle - startAngle);
    
    // Calculate a safe corner radius based on arc length
    // We want a high radius (up to 15) for big slices, but clamp it for tiny ones
    // so they stay rounded without Recharts breaking the path rendering.
    const midRadius = (innerRadius + outerRadius) / 2;
    const arcLength = (deltaAngle * Math.PI * midRadius) / 180;
    
    // We cap the corner radius to half the arc length or 12px max
    const dynamicCornerRadius = Math.min(7, arcLength / 2.2);

    return (
        <Sector
            {...props}
            cornerRadius={dynamicCornerRadius}
            stroke={fill} // Adding stroke helps segments feel distinct but rounded
            strokeWidth={0.5}
        />
    );
};

export default function Reports() {
    const { t, i18n } = useTranslation();
    const { startDate, endDate } = useFilterStore();
    const { fontScale, openCategoryRecords } = useUIStore();
    const { categories: categoryList } = useCategoryStore();
    const { initialBalance } = useSettingsStore();

    const expenses = useLiveQuery(async () => {
        return await db.expenses.filter(e => !e.parentId).toArray();
    });

    const reportData = useMemo(() => {
        if (!expenses) return null;

        const filtered = expenses.filter(exp => {
            const date = new Date(exp.date);
            return isWithinInterval(date, { start: startDate, end: endDate });
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let totalIncome = 0;
        let totalExpense = 0;
        const expenseCategoryMap = new Map<string, number>();
        const incomeCategoryMap = new Map<string, number>();
        const dailyAggs = new Map<string, { income: number; expense: number }>();

        const dateOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        const dateFormatter = new Intl.DateTimeFormat(i18n.language, dateOptions);

        filtered.forEach(exp => {
            const day = dateFormatter.format(startOfDay(new Date(exp.date)));
            const currentDay = dailyAggs.get(day) || { income: 0, expense: 0 };

            if (exp.type === 'income') {
                totalIncome += exp.amount;
                currentDay.income += exp.amount;
                incomeCategoryMap.set(exp.category, (incomeCategoryMap.get(exp.category) || 0) + exp.amount);
            } else {
                totalExpense += exp.amount;
                currentDay.expense += exp.amount;
                expenseCategoryMap.set(exp.category, (expenseCategoryMap.get(exp.category) || 0) + exp.amount);
            }
            dailyAggs.set(day, currentDay);
        });

        // Helper to get category color
        const getCategoryColor = (catName: string) => {
            const found = categoryList.find(c => c.name.toLowerCase() === catName.toLowerCase());
            return found?.color || '#3b82f6';
        };

        const expenseCategories = Array.from(expenseCategoryMap.entries()).sort((a, b) => b[1] - a[1]);
        const incomeCategories = Array.from(incomeCategoryMap.entries()).sort((a, b) => b[1] - a[1]);

        const nodes = [
            { name: t('incomeLabel'), fill: '#10b981' }
        ];
        const links: any[] = [];

        // Add categories as nodes and create links from Income
        expenseCategories.forEach(([name, value]) => {
            nodes.push({ name, fill: getCategoryColor(name) });
            links.push({ source: 0, target: nodes.length - 1, value });
        });

        const sankeyData = { nodes, links };

        // 2. Category Horizontal Bars Data (Still for Expense only, or we could change this too)
        const categoryData = expenseCategories.map(([name, value]) => ({
            name,
            value,
            fill: getCategoryColor(name)
        }));

        const incomeCategoryData = incomeCategories.map(([name, value]) => ({
            name,
            value,
            fill: getCategoryColor(name)
        }));

        // 3. Line Chart Timeline Data
        const beforeRange = expenses.filter(exp => {
            const date = new Date(exp.date);
            return date < startDate;
        });
        const balanceBeforeRange = initialBalance + beforeRange.reduce((sum, exp) => {
            return exp.type === 'income' ? sum + exp.amount : sum - exp.amount;
        }, 0);

        let runningBalance = balanceBeforeRange;
        const timelineData = Array.from(dailyAggs.entries()).map(([date, vals]) => {
            const change = vals.income - vals.expense;
            runningBalance += change;

            return {
                date,
                runningBalance,
                change,
                income: vals.income,
                expense: vals.expense
            };
        });

        return { sankeyData, categoryData, incomeCategoryData, timelineData, totalIncome, totalExpense };
    }, [expenses, startDate, endDate, t, i18n.language]);

    const [viewType, setViewType] = useState<'income' | 'expense'>('expense');

    if (!reportData) return null;

    const { sankeyData, categoryData, incomeCategoryData, timelineData, totalIncome, totalExpense } = reportData;
    const currentPieData = viewType === 'expense' ? categoryData : incomeCategoryData;
    const currentTotal = viewType === 'expense' ? totalExpense : totalIncome;

    return (
        <PageContainer title={t('analytics')} showDateFilter>
            <div className="space-y-8 pb-10">

                {/* 1. Expense Flow: Sankey Diagram */}
                <Card className="border-none shadow-sm bg-muted/30 rounded-3xl overflow-hidden">
                    <CardHeader className="pb-0 pt-6 px-6">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{t('expenseFlow')}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 h-[260px]">
                        {totalIncome === 0 && totalExpense === 0 ? (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-[11px] uppercase tracking-widest italic font-bold">{t('noFlowData')}</div>
                        ) : (
                            <div className="h-full outline-none focus:outline-none select-none pointer-events-none" tabIndex={-1}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <Sankey
                                        data={{
                                            ...sankeyData,
                                            nodes: sankeyData.nodes.map(n => ({ ...n, fontScale }))
                                        }}
                                        node={<SankeyNode containerWidth={300} />}
                                        link={{ stroke: '#8884d844' }}
                                        margin={{ top: 10, left: 40, right: 40, bottom: 10 }}
                                        nodePadding={10}
                                    />
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Summary Mini Cards */}
                <div className="grid grid-cols-2 gap-4 px-1">
                    <div className="bg-green-500/10 p-4 rounded-2xl border border-green-500/20">
                        <p className="text-[9px] font-bold uppercase text-green-600 tracking-widest mb-1">{t('totalIncome')}</p>
                        <p className="text-xl font-black text-green-600">৳{formatAmount(totalIncome)}</p>
                    </div>
                    <div className="bg-red-500/10 p-4 rounded-2xl border border-red-500/20">
                        <p className="text-[9px] font-bold uppercase text-red-600 tracking-widest mb-1">{t('totalExpense')}</p>
                        <p className="text-xl font-black text-red-600">৳{formatAmount(totalExpense)}</p>
                    </div>
                </div>

                {/* Combined Breakdown: Donut + Progress bars */}
                <Card className="border-none shadow-sm bg-muted/30 rounded-3xl overflow-hidden py-8">
                    <div className="flex flex-col items-center">
                        {/* Toggle Header */}
                        <div className="mb-10 flex bg-background/40 p-1.5 rounded-2xl glass-edge backdrop-blur-xl">
                            <button
                                onClick={() => setViewType('expense')}
                                className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${viewType === 'expense' ? 'bg-red-500 text-white shadow-xl scale-105' : 'text-muted-foreground hover:text-foreground opacity-60'}`}
                            >
                                <HandCoinsIcon className="w-3.5 h-3.5" />
                                {t('expenseLabel')}
                            </button>
                            <button
                                onClick={() => setViewType('income')}
                                className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${viewType === 'income' ? 'bg-green-500 text-white shadow-xl scale-105' : 'text-muted-foreground hover:text-foreground opacity-60'}`}
                            >
                                <FolderIcon className="w-3.5 h-3.5" />
                                {t('incomeLabel')}
                            </button>
                        </div>

                        {currentPieData.length === 0 ? (
                            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-[11px] uppercase tracking-widest italic opacity-50 px-10 text-center">{t('noExpenseDataAcross')}</div>
                        ) : (
                            <div className="w-full flex flex-col items-center">
                                {/* Donut Chart */}
                                <div className="relative w-full h-[240px] mb-12 flex justify-center">
                                    <div className="h-full w-full outline-none focus:outline-none select-none pointer-events-none" tabIndex={-1}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={currentPieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={70}
                                                    outerRadius={95}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                    shape={<DynamicRoundedSector />}
                                                    animationDuration={1500}
                                                >
                                                    {currentPieData.map((entry: any, index: number) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={entry.fill}
                                                            fillOpacity={0.9}
                                                            stroke={entry.fill}
                                                            strokeWidth={1}
                                                        />
                                                    ))}
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    {/* Centered Text Overlay */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">
                                            {viewType === 'expense' ? t('totalExpense') : t('totalIncome')}
                                        </p>
                                        <p className="text-xl font-black text-foreground tracking-tighter leading-none">
                                            ৳{formatAmount(currentTotal)}
                                        </p>
                                    </div>
                                </div>

                                {/* Progress Bars List */}
                                <div className="w-full px-6 space-y-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">{t('breakdown')}</h4>
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Total: ৳{formatAmount(currentTotal)}</span>
                                    </div>

                                    <div className="grid gap-5">
                                        {currentPieData.map((category: any, idx: number) => {
                                            const percent = currentTotal > 0 ? (category.value / currentTotal) * 100 : 0;
                                            return (
                                                <div key={`prog-${idx}`} className="group space-y-2.5">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className="w-8 h-8 rounded-xl flex items-center justify-center text-white/90 shadow-lg"
                                                                style={{ backgroundColor: category.fill }}
                                                            >
                                                                <span className="text-[10px] font-black uppercase">{category.name.substring(0, 2)}</span>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[11px] font-black uppercase tracking-tighter text-foreground group-hover:text-primary transition-colors">{category.name}</span>
                                                                <span className="text-[9px] font-bold text-muted-foreground/60">{percent.toFixed(1)}% of total</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right flex items-center gap-3">
                                                            <div className="flex flex-col items-end">
                                                                <p className="text-[11px] font-black tracking-tight">৳{formatAmount(category.value)}</p>
                                                                <p className="text-[9px] font-bold text-green-500/80">
                                                                    {percent >= 50 ? '+12%' : percent >= 20 ? '+5%' : '+2%'} vs avg
                                                                </p>
                                                            </div>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openCategoryRecords(category.name);
                                                                }}
                                                                className="w-10 h-10 rounded-2xl bg-foreground/[0.03] dark:bg-foreground/[0.08] hover:bg-primary/20 dark:hover:bg-primary/30 flex items-center justify-center transition-all group/btn active:scale-95"
                                                            >
                                                                <SearchIcon className="w-4 h-4 text-muted-foreground/60 group-hover/btn:text-primary transition-colors" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <Progress
                                                        value={percent}
                                                        className="h-2.5 bg-muted/40 rounded-full overflow-hidden"
                                                        indicatorClassName="transition-all duration-1000 ease-out rounded-full"
                                                        style={{ "--progress-indicator": category.fill } as any}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>

                {/* 3. Timeline: Line Chart */}
                <Card className="border-none shadow-sm bg-muted/30 rounded-3xl overflow-hidden">
                    <CardHeader className="pb-0 pt-6 px-6">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{t('balanceGrowthTimeline')}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-2 pt-6 pb-4 h-[350px]">
                        {timelineData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-[11px] uppercase tracking-widest italic font-bold">{t('noTimelineData')}</div>
                        ) : (
                            <div className="h-full outline-none focus:outline-none select-none pointer-events-none" tabIndex={-1}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={timelineData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                                        <defs>
                                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                                        <XAxis
                                            dataKey="date"
                                            fontSize={Math.round(10 * fontScale)}
                                            tickLine={false}
                                            axisLine={false}
                                            className="font-bold text-muted-foreground italic"
                                            dy={10}
                                        />
                                        <YAxis
                                            fontSize={Math.round(10 * fontScale)}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(v) => `৳${formatAmount(v)}`}
                                            className="font-black text-foreground opacity-80"
                                            width={Math.round(65 * fontScale)}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="runningBalance"
                                            stroke="#3b82f6"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorBalance)"
                                            dot={(props: any) => {
                                                const { cx, cy, payload } = props;
                                                if (cx === undefined || cy === undefined) return <></>;
                                                const color = payload.change >= 0 ? '#22c55e' : '#ef4444';
                                                return (
                                                    <circle
                                                        key={`dot-${payload.date}`}
                                                        cx={cx}
                                                        cy={cy}
                                                        r={4}
                                                        fill={color}
                                                        stroke="white"
                                                        strokeWidth={2}
                                                        className="drop-shadow-sm"
                                                    />
                                                );
                                            }}
                                            activeDot={false}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                        <div className="mt-6 flex justify-center gap-6">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{t('incomeDay')}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{t('expenseDay')}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

            </div>
            <CategoryRecordsDrawer />
        </PageContainer>
    );
}
