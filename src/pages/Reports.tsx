import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { format, isWithinInterval } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { useFilterStore } from '@/stores/filterStore';
import { PageContainer } from '@/components/shared/PageContainer';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a28CFE', '#f28C1E', '#32da1E'];

export default function Reports() {
    const { startDate, endDate } = useFilterStore();

    const expenses = useLiveQuery(async () => {
        return await db.expenses.toArray();
    });

    const chartData = useMemo(() => {
        if (!expenses) return { daily: [], category: [] };

        const filtered = expenses.filter(exp => {
            const date = new Date(exp.date);
            return isWithinInterval(date, { start: startDate, end: endDate });
        });

        // Daily breakdown
        const dailyMap = new Map<string, number>();
        // Category breakdown
        const categoryMap = new Map<string, number>();

        filtered.forEach(exp => {
            // daily
            const day = format(new Date(exp.date), 'MMM dd');
            dailyMap.set(day, (dailyMap.get(day) || 0) + exp.amount);

            // category
            categoryMap.set(exp.category, (categoryMap.get(exp.category) || 0) + exp.amount);
        });

        const daily = Array.from(dailyMap.entries())
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const category = Array.from(categoryMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        return { daily, category };
    }, [expenses, startDate, endDate]);

    const totalSpent = chartData.category.reduce((sum, item) => sum + item.value, 0);

    return (
        <PageContainer title="Reports" showDateFilter>
            <div className="mb-4 text-center pb-2">
                <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">Total Spent</p>
                <h2 className="text-3xl font-black text-primary">৳{totalSpent.toFixed(2)}</h2>
            </div>

            {chartData.daily.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground border border-dashed rounded-lg bg-muted/20">
                    No data available for this period.
                </div>
            ) : (
                <div className="space-y-6">
                    <Card className="border-none shadow-sm bg-muted/30">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Daily Spending</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[250px] pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData.daily}>
                                    <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `৳${value}`} />
                                    <Bar dataKey="amount" fill="var(--primary)" radius={[4, 4, 0, 0]}>
                                        <LabelList
                                            dataKey="amount"
                                            position="top"
                                            fontSize={9}
                                            fontWeight={600}
                                            formatter={(value: unknown) => `৳${Number(value).toFixed(0)}`}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-muted/30">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Budget Distribution</CardTitle>
                        </CardHeader>
                        <CardContent
                            className="pt-4"
                            style={{ height: `${Math.max(chartData.category.length * 56 + 16, 120)}px` }}
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={chartData.category}
                                    layout="vertical"
                                    margin={{ top: 0, right: 72, left: 4, bottom: 0 }}
                                >
                                    <XAxis type="number" hide />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        width={90}
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fill: 'currentColor' }}
                                    />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28}>
                                        {chartData.category.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                        <LabelList
                                            dataKey="value"
                                            position="right"
                                            fontSize={11}
                                            fontWeight={600}
                                            formatter={(value: unknown) => `৳${Number(value).toFixed(0)}`}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            )}
        </PageContainer>
    );
}
