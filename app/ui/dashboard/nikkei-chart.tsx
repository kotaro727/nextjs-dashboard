'use client';

import { useEffect, useState } from 'react';
import { ChartData } from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function NikkeiChart() {
  const [chartData, setChartData] = useState<ChartData<'line'>>();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/nikkei');
        const data = await response.json();
        console.log('data', data);
        if (data['Time Series (Daily)']) {
          const timeSeries = data['Time Series (Daily)'];
          const labels = Object.keys(timeSeries).reverse();
          const prices = labels.map(date => parseFloat(timeSeries[date]['4. close']));
          
          setChartData({
            labels,
            datasets: [{
              label: '日経平均株価',
              data: prices,
              borderColor: 'rgb(75, 192, 192)',
              tension: 0.1
            }]
          });
        }
      } catch (error) {
        console.error('Error fetching Nikkei data:', error);
      }
    };

    fetchData();
  }, []);

  if (!chartData) return <div>Loading...</div>;

  return (
    <div className="w-full h-[400px]">
      <Line
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: true,
              text: '日経平均株価チャート',
            },
          },
        }}
      />
    </div>
  );
}
