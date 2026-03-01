import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a28CFE', '#f28C1E', '#32da1E'];

export default function Reports() {
    const [timeframe, setTimeframe] = useState<'month' | 'week'>('month');

    const expenses = useLiveQuery(async () => {
        return await db.expenses.toArray();
    });

    const chartData = useMemo(() => {
        if (!expenses) return { daily: [], category: [] };

        const now = new Date();
        const startDate = timeframe === 'month' ? startOfMonth(now) : subDays(now, 7);
        const endDate = timeframe === 'month' ? endOfMonth(now) : now;

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
    }, [expenses, timeframe]);

    const totalSpent = chartData.category.reduce((sum, item) => sum + item.value, 0);

    return (
        <div className="p-4 h-full flex flex-col pt-10 pb-20 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
                <select
                    className="bg-transparent text-sm border-b focus:outline-none"
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value as 'month' | 'week')}
                >
                    <option value="month">This Month</option>
                    <option value="week">Past 7 Days</option>
                </select>
            </div>

            <div className="mb-6 text-center">
                <p className="text-muted-foreground text-sm">Total Spent</p>
                <h2 className="text-3xl font-bold text-primary">৳{totalSpent.toFixed(2)}</h2>
            </div>

            {chartData.daily.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground border border-dashed rounded-lg">
                    No data available for this period.
                </div>
            ) : (
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Daily Spending</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[250px] pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData.daily}>
                                    <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `৳${value}`} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Spending by Category</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px] pt-4 flex justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData.category}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {chartData.category.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number) => `৳${value.toFixed(2)}`}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
