import { isWithinInterval, startOfDay } from 'date-fns';
import { type Expense, type Category } from '@/db/schema';

export interface AnalyticsCategoryItem {
    name: string;
    value: number;
    fill: string;
}

export interface TimelineDataPoint {
    date: string;
    runningBalance: number;
    change: number;
    income: number;
    expense: number;
}

export interface SankeyGraphData {
    nodes: Array<{ name: string; fill: string }>;
    links: Array<{ source: number; target: number; value: number }>;
}

export interface ReportAnalyticsResult {
    totalIncome: number;
    totalExpense: number;
    categoryData: AnalyticsCategoryItem[];
    incomeCategoryData: AnalyticsCategoryItem[];
    timelineData: TimelineDataPoint[];
    sankeyData: SankeyGraphData;
}

export interface CalculateAnalyticsOptions {
    expenses: Expense[];
    startDate: Date;
    endDate: Date;
    initialBalance?: number;
    categoryList?: Category[];
    language?: string;
    incomeLabel?: string;
}

export function calculateReportAnalytics({
    expenses,
    startDate,
    endDate,
    initialBalance = 0,
    categoryList = [],
    language = 'en',
    incomeLabel = 'Income'
}: CalculateAnalyticsOptions): ReportAnalyticsResult {
    const filtered = expenses
        .filter(exp => {
            const date = new Date(exp.date);
            return isWithinInterval(date, { start: startDate, end: endDate });
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let totalIncome = 0;
    let totalExpense = 0;
    const expenseCategoryMap = new Map<string, number>();
    const incomeCategoryMap = new Map<string, number>();
    const dailyAggs = new Map<string, { income: number; expense: number }>();

    const dateOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const dateFormatter = new Intl.DateTimeFormat(language, dateOptions);

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

    const getCategoryColor = (catName: string) => {
        const found = categoryList.find(c => c.name.toLowerCase() === catName.toLowerCase());
        return found?.color || '#3b82f6';
    };

    const expenseCategories = Array.from(expenseCategoryMap.entries()).sort((a, b) => b[1] - a[1]);
    const incomeCategories = Array.from(incomeCategoryMap.entries()).sort((a, b) => b[1] - a[1]);

    const nodes = [
        { name: incomeLabel, fill: '#10b981' }
    ];
    const links: Array<{ source: number; target: number; value: number }> = [];

    expenseCategories.forEach(([name, value]) => {
        nodes.push({ name, fill: getCategoryColor(name) });
        links.push({ source: 0, target: nodes.length - 1, value });
    });

    const sankeyData: SankeyGraphData = { nodes, links };

    const categoryData: AnalyticsCategoryItem[] = expenseCategories.map(([name, value]) => ({
        name,
        value,
        fill: getCategoryColor(name)
    }));

    const incomeCategoryData: AnalyticsCategoryItem[] = incomeCategories.map(([name, value]) => ({
        name,
        value,
        fill: getCategoryColor(name)
    }));

    const beforeRange = expenses.filter(exp => {
        const date = new Date(exp.date);
        return date < startDate;
    });
    const balanceBeforeRange = initialBalance + beforeRange.reduce((sum, exp) => {
        return exp.type === 'income' ? sum + exp.amount : sum - exp.amount;
    }, 0);

    let runningBalance = balanceBeforeRange;
    const timelineData: TimelineDataPoint[] = Array.from(dailyAggs.entries()).map(([date, vals]) => {
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

    return {
        sankeyData,
        categoryData,
        incomeCategoryData,
        timelineData,
        totalIncome,
        totalExpense
    };
}
