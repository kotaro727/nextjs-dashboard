import NikkeiChart from '@/app/ui/dashboard/nikkei-chart';

export default function Page() {
  return (
    <main className="w-full p-6">
      <h1 className="text-2xl font-bold mb-4">日経平均株価チャート</h1>
      <div className="bg-white rounded-lg shadow p-4">
        <NikkeiChart />
      </div>
    </main>
  );
}
