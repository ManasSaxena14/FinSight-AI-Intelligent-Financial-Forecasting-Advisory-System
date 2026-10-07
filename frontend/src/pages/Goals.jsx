import GoalTracker from '../components/GoalTracker';
import { PageHeader } from '../components/ui';

export default function Goals() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Goals"
        title="Save with"
        accent="a plan."
        description="Each goal is checked against what you've actually saved over recent months. Goals due sooner get first claim on that money."
      />
      <GoalTracker />
    </div>
  );
}
