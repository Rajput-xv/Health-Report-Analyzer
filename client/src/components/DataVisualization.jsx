import React from 'react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import 'chart.js/auto';
import '../styles/dashboard.css';

export default function DataVisualization() {
  // Example health data (replace with your real data)
  const lineData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    datasets: [
      {
        label: 'Health Score',
        data: [80, 85, 78, 90, 95],
        fill: true,
        backgroundColor: 'rgba(75,192,192,0.2)',
        borderColor: 'rgba(75,192,192,1)',
        tension: 0.4,
      },
    ],
  };

  const barData = {
    labels: ['Protein', 'Carbs', 'Fat', 'Fiber'],
    datasets: [
      {
        label: 'Nutrient Intake (g)',
        data: [50, 150, 70, 30],
        backgroundColor: ['#4bc0c0', '#ff6384', '#ffcd56', '#36a2eb'],
      },
    ],
  };

  const pieData = {
    labels: ['Exercise', 'Sleep', 'Meditation', 'Other'],
    datasets: [
      {
        label: 'Weekly Activity',
        data: [40, 30, 20, 10],
        backgroundColor: ['#ff6384', '#36a2eb', '#ffcd56', '#4bc0c0'],
      },
    ],
  };

  return (
    <div>
      <div className="data-vis-container">
        <div className="chart-title">Health Score Over Time</div>
        <div className="chart-wrapper">
          <Line data={lineData} options={{ responsive: true, maintainAspectRatio: false }} />
        </div>
      </div>

      <div className="data-vis-container">
        <div className="chart-title">Nutrient Intake</div>
        <div className="chart-wrapper">
          <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false }} />
        </div>
      </div>

      <div className="data-vis-container">
        <div className="chart-title">Weekly Activity Distribution</div>
        <div className="chart-wrapper">
          <Pie data={pieData} options={{ responsive: true, maintainAspectRatio: false }} />
        </div>
      </div>
    </div>
  );
}
