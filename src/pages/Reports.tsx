import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { format, isWithinInterval, startOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList,
    Tooltip, Sankey, Layer, AreaChart, Area, CartesianGrid
} from 'recharts';
import { useFilterStore } from '@/stores/filterStore';
import { useUIStore } from '@/stores/uiStore';
import { PageContainer } from '@/components/shared/PageContainer';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a28CFE', '#f28C1E', '#32da1E'];

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
                className="fill-foreground/80 uppercase tracking-tighter"
            >
                {payload.name}
            </text>
        </Layer>
    );
};

export default function Reports() {
    const { startDate, endDate } = useFilterStore();
    const { fontScale } = useUIStore();

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
        const categoryMap = new Map<string, number>();
        const dailyAggs = new Map<string, { income: number; expense: number }>();

        filtered.forEach(exp => {
            const day = format(startOfDay(new Date(exp.date)), 'MMM dd');
            const currentDay = dailyAggs.get(day) || { income: 0, expense: 0 };

            if (exp.type === 'income') {
                totalIncome += exp.amount;
                currentDay.income += exp.amount;
            } else {
                totalExpense += exp.amount;
                currentDay.expense += exp.amount;
                categoryMap.set(exp.category, (categoryMap.get(exp.category) || 0) + exp.amount);
            }
            dailyAggs.set(day, currentDay);
        });

        // 1. Sankey Data (Flow)
        const categories = Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1]);

        const nodes = [
            { name: 'Income', fill: '#10b981' }
        ];
        const links: any[] = [];

        // Add categories as nodes and create links from Income
        categories.forEach(([name, value], idx) => {
            nodes.push({ name, fill: COLORS[idx % COLORS.length] });
            links.push({ source: 0, target: nodes.length - 1, value });
        });

        const sankeyData = { nodes, links };

        // 2. Category Horizontal Bars Data
        const categoryData = categories.map(([name, value]) => ({ name, value }));

        // 3. Line Chart Timeline Data
        let runningBalance = 0;
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

        return { sankeyData, categoryData, timelineData, totalIncome, totalExpense };
    }, [expenses, startDate, endDate]);

    if (!reportData) return null;

    const { sankeyData, categoryData, timelineData, totalIncome, totalExpense } = reportData;

    return (
        <PageContainer title="Analytics" showDateFilter>
            <div className="space-y-8 pb-10">

                {/* 1. Expense Flow: Sankey Diagram */}
                <Card className="border-none shadow-sm bg-muted/30 rounded-3xl overflow-hidden">
                    <CardHeader className="pb-0 pt-6 px-6">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Expense Flow (Sankey)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 h-[260px]">
                        {totalIncome === 0 && totalExpense === 0 ? (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-[11px] uppercase tracking-widest italic opacity-50">No flow data</div>
                        ) : (
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
                                >
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        formatter={(value) => `৳${Number(value).toFixed(0)}`}
                                    />
                                </Sankey>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Summary Mini Cards */}
                <div className="grid grid-cols-2 gap-4 px-1">
                    <div className="bg-green-500/10 p-4 rounded-2xl border border-green-500/20">
                        <p className="text-[9px] font-bold uppercase text-green-600 tracking-widest mb-1">Total Income</p>
                        <p className="text-xl font-black text-green-600">৳{totalIncome.toFixed(0)}</p>
                    </div>
                    <div className="bg-red-500/10 p-4 rounded-2xl border border-red-500/20">
                        <p className="text-[9px] font-bold uppercase text-red-600 tracking-widest mb-1">Total Expense</p>
                        <p className="text-xl font-black text-red-600">৳{totalExpense.toFixed(0)}</p>
                    </div>
                </div>

                {/* 2. Spending by Category: Horizontal Bars */}
                <Card className="border-none shadow-sm bg-muted/30 rounded-3xl overflow-hidden">
                    <CardHeader className="pb-0 pt-6 px-6">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Spending by Category</CardTitle>
                    </CardHeader>
                    <CardContent
                        className="px-4 pt-6 pb-2"
                        style={{ height: `${Math.max(categoryData.length * 45 + 60, 150)}px` }}
                    >
                        {categoryData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-[11px] uppercase tracking-widest italic opacity-50">No expense data</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={categoryData}
                                    layout="vertical"
                                    margin={{ top: 5, right: 60, left: 10, bottom: 20 }}
                                >
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        fontSize={Math.round(11 * fontScale)}
                                        tickLine={false}
                                        axisLine={false}
                                        width={Math.round(80 * fontScale)}
                                        className="font-bold text-muted-foreground uppercase tracking-tighter"
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        formatter={(value) => `৳${Number(value).toFixed(0)}`}
                                    />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                                        {categoryData.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                        <LabelList
                                            dataKey="value"
                                            position="right"
                                            fontSize={10}
                                            fontWeight={800}
                                            formatter={(v: any) => `৳${v.toFixed(0)}`}
                                            className="fill-foreground/70"
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* 3. Timeline: Line Chart */}
                <Card className="border-none shadow-sm bg-muted/30 rounded-3xl overflow-hidden">
                    <CardHeader className="pb-0 pt-6 px-6">
                        <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Balance Growth Timeline</CardTitle>
                    </CardHeader>
                    <CardContent className="px-2 pt-6 pb-4 h-[350px]">
                        {timelineData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-[11px] uppercase tracking-widest italic opacity-50">No timeline data</div>
                        ) : (
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
                                        tickFormatter={(v) => `৳${v}`}
                                        className="font-bold opacity-60"
                                        width={Math.round(65 * fontScale)}
                                    />
                                    <Tooltip
                                        content={({ active, payload, label }: any) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-background/95 backdrop-blur-md p-3 border border-border rounded-2xl shadow-xl">
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
                                                        <p className="text-sm font-black flex items-center gap-2">
                                                            Balance: ৳{data.runningBalance.toFixed(0)}
                                                        </p>
                                                        <div className="flex gap-3 mt-1">
                                                            {data.income > 0 && (
                                                                <p className="text-[9px] font-black text-green-500 uppercase tracking-tighter">+৳{data.income.toFixed(0)}</p>
                                                            )}
                                                            {data.expense > 0 && (
                                                                <p className="text-[9px] font-black text-red-500 uppercase tracking-tighter">-৳{data.expense.toFixed(0)}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
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
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                        <div className="mt-6 flex justify-center gap-6">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Income Day</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Expense Day</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </PageContainer>
    );
}
