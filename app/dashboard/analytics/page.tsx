"use client";
import { Header } from '@/app/components/Header';

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-gray-100">
      <Header onToggleHistory={() => {}} />
      <main className="flex-1 p-6">
        <h1 className="text-3xl font-bold mb-6">Business Analytics</h1>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Usage Metrics</h2>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="p-2">Metric</th>
                <th className="p-2">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-700">
                <td className="p-2">Total Users</td>
                <td className="p-2">1,234</td>
              </tr>
              <tr className="border-b border-gray-700">
                <td className="p-2">Active Subscriptions</td>
                <td className="p-2">567</td>
              </tr>
              <tr className="border-b border-gray-700">
                <td className="p-2">Reviews per Day</td>
                <td className="p-2">890</td>
              </tr>
              <tr>
                <td className="p-2">Churn Rate</td>
                <td className="p-2">5%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
