import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { GoalCard } from './GoalCard';

export function GoalList() {
    const goals = useLiveQuery(
        () => db.goals.orderBy('createdAt').reverse().toArray()
    );

    if (!goals) {
        return <div className="p-4 text-center text-muted-foreground">Loading goals...</div>;
    }

    if (goals.length === 0) {
        return (
            <div className="p-8 text-center flex flex-col items-center justify-center">
                <div className="text-4xl mb-4">🏆</div>
                <h3 className="font-semibold text-lg">No savings goals yet</h3>
                <p className="text-muted-foreground text-sm">Set a goal to start saving.</p>
            </div>
        );
    }

    return (
        <div className="space-y-1 pb-20">
            {goals.map((goal) => (
                <GoalCard
                    key={goal.id}
                    goal={goal}
                    onClick={() => console.log('Edit goal', goal.id)}
                />
            ))}
        </div>
    );
}
