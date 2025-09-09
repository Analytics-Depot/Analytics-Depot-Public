import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Pie, Scatter } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const ChartRenderer = ({ chartData, chartType }) => {
  if (!chartData) {
    return <div className="text-[#8C6A58] text-center py-8">No chart data available</div>;
  }

  const renderTimeSeriesChart = (data) => {
    if (!data.series || !data.series[0] || !data.series[0].data) {
      return <div className="text-[#8C6A58] text-center py-8">Invalid time series data</div>;
    }

    const series = data.series[0];
    const chartData = {
      labels: series.data.map(item => {
        const date = new Date(item[0]);
        return date.toLocaleDateString();
      }),
      datasets: [{
        label: series.name || 'Value',
        data: series.data.map(item => item[1]),
        borderColor: '#D9B799',
        backgroundColor: 'rgba(217, 183, 153, 0.1)',
        tension: 0.4,
        pointBackgroundColor: '#D9B799',
        pointBorderColor: '#2D1F14',
        pointBorderWidth: 2,
      }]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#F0E6DA',
          },
        },
        title: {
          display: true,
          text: data.title || 'Time Series Chart',
          color: '#F0E6DA',
          font: {
            size: 16,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#D9B799',
          },
          grid: {
            color: 'rgba(217, 183, 153, 0.1)',
          },
        },
        y: {
          ticks: {
            color: '#D9B799',
          },
          grid: {
            color: 'rgba(217, 183, 153, 0.1)',
          },
        },
      },
    };

    return (
      <div className="h-80">
        <Line data={chartData} options={options} />
      </div>
    );
  };

  const renderBarChart = (data) => {
    if (!data.categories || !data.series || !data.series[0]) {
      return <div className="text-[#8C6A58] text-center py-8">Invalid bar chart data</div>;
    }

    const chartData = {
      labels: data.categories,
      datasets: [{
        label: data.series[0].name || 'Value',
        data: data.series[0].data,
        backgroundColor: 'rgba(217, 183, 153, 0.8)',
        borderColor: '#D9B799',
        borderWidth: 2,
      }]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#F0E6DA',
          },
        },
        title: {
          display: true,
          text: data.title || 'Bar Chart',
          color: '#F0E6DA',
          font: {
            size: 16,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#D9B799',
          },
          grid: {
            color: 'rgba(217, 183, 153, 0.1)',
          },
        },
        y: {
          ticks: {
            color: '#D9B799',
          },
          grid: {
            color: 'rgba(217, 183, 153, 0.1)',
          },
        },
      },
    };

    return (
      <div className="h-80">
        <Bar data={chartData} options={options} />
      </div>
    );
  };

  const renderPieChart = (data) => {
    if (!data.categories || !data.series || !data.series[0]) {
      return <div className="text-[#8C6A58] text-center py-8">Invalid pie chart data</div>;
    }

    const chartData = {
      labels: data.categories,
      datasets: [{
        data: data.series[0].data,
        backgroundColor: [
          'rgba(217, 183, 153, 0.8)',
          'rgba(196, 160, 133, 0.8)',
          'rgba(139, 69, 19, 0.8)',
          'rgba(160, 82, 45, 0.8)',
          'rgba(205, 133, 63, 0.8)',
        ],
        borderColor: '#2D1F14',
        borderWidth: 2,
      }]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#F0E6DA',
          },
        },
        title: {
          display: true,
          text: data.title || 'Pie Chart',
          color: '#F0E6DA',
          font: {
            size: 16,
          },
        },
      },
    };

    return (
      <div className="h-80">
        <Pie data={chartData} options={options} />
      </div>
    );
  };

  const renderScatterChart = (data) => {
    if (!data.series || !data.series[0] || !data.series[0].data) {
      return <div className="text-[#8C6A58] text-center py-8">Invalid scatter chart data</div>;
    }

    const series = data.series[0];
    const chartData = {
      datasets: [{
        label: series.name || 'Data Points',
        data: series.data.map(item => ({
          x: item[0],
          y: item[1]
        })),
        backgroundColor: 'rgba(217, 183, 153, 0.6)',
        borderColor: '#D9B799',
        borderWidth: 1,
        pointRadius: 6,
      }]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#F0E6DA',
          },
        },
        title: {
          display: true,
          text: data.title || 'Scatter Plot',
          color: '#F0E6DA',
          font: {
            size: 16,
          },
        },
      },
      scales: {
        x: {
          type: 'linear',
          ticks: {
            color: '#D9B799',
          },
          grid: {
            color: 'rgba(217, 183, 153, 0.1)',
          },
        },
        y: {
          type: 'linear',
          ticks: {
            color: '#D9B799',
          },
          grid: {
            color: 'rgba(217, 183, 153, 0.1)',
          },
        },
      },
    };

    return (
      <div className="h-80">
        <Scatter data={chartData} options={options} />
      </div>
    );
  };

  // Determine chart type from data or props
  const type = chartType || chartData.type;

  switch (type) {
    case 'time_series':
      return renderTimeSeriesChart(chartData);
    case 'bar':
      return renderBarChart(chartData);
    case 'pie':
      return renderPieChart(chartData);
    case 'scatter':
      return renderScatterChart(chartData);
    default:
      return (
        <div className="text-[#8C6A58] text-center py-8">
          Unsupported chart type: {type}
        </div>
      );
  }
};

export default ChartRenderer;
