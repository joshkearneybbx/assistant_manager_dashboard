import { TopClientsByCategoryChart } from '../components/analytics/TopClientsByCategoryChart';

export function Analytics() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-sand-300 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-base-black">Analytics</h1>
        <p className="mt-1 text-sm text-grey-400">Charts and insights across client activity and assistant workflows.</p>
      </section>

      <div className="space-y-6">
        <TopClientsByCategoryChart />
      </div>
    </div>
  );
}
