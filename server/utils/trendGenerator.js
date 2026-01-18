// Generate trend data for health parameters
function generateTrendData(currentParameters) {
  const trends = {};
  
  // Generate dummy historical data for each numeric parameter only
  // Categorical/text parameters don't have meaningful trends
  currentParameters.forEach(param => {
    // Skip non-numeric parameters - they can't have trend data
    if (param.parameterType && param.parameterType !== 'numeric') {
      return;
    }
    
    // Also skip if value is not a valid number
    if (typeof param.value !== 'number' || isNaN(param.value) || param.value === 0) {
      return;
    }
    
    const trendData = generateParameterTrend(param);
    trends[param.name] = trendData;
  });

  return trends;
}

function generateParameterTrend(parameter) {
  const currentValue = parameter.value;
  const historicalPoints = 6; // Last 6 months
  const data = [];

  // Generate dates for the last 6 months
  const dates = [];
  for (let i = historicalPoints - 1; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    dates.push(date.toISOString().split('T')[0]);
  }

  // Generate realistic historical values
  for (let i = 0; i < historicalPoints; i++) {
    let value;
    
    if (i === historicalPoints - 1) {
      // Last point is the current value
      value = currentValue;
    } else {
      // Generate values with some variation around the current value
      const variation = currentValue * 0.15; // 15% variation
      const randomFactor = (Math.random() - 0.5) * 2; // -1 to 1
      value = currentValue + (variation * randomFactor);
      
      // Ensure the value stays positive
      value = Math.max(value, currentValue * 0.1);
      
      // Round to appropriate decimal places
      value = Math.round(value * 100) / 100;
    }

    data.push({
      date: dates[i],
      value: value,
      status: determineStatusForTrend(value, parameter.normalRange)
    });
  }

  return {
    parameter: parameter.name,
    unit: parameter.unit,
    normalRange: parameter.normalRange,
    data: data,
    trend: calculateTrend(data),
    insights: generateInsights(parameter, data)
  };
}

function determineStatusForTrend(value, normalRange) {
  try {
    if (normalRange.includes('<')) {
      const threshold = parseFloat(normalRange.replace('<', ''));
      return value <= threshold ? 'Normal' : 'High';
    } else if (normalRange.includes('>')) {
      const threshold = parseFloat(normalRange.replace('>', ''));
      return value >= threshold ? 'Normal' : 'Low';
    } else if (normalRange.includes('-')) {
      const [min, max] = normalRange.split('-').map(v => parseFloat(v));
      if (value < min) return 'Low';
      if (value > max) return 'High';
      return 'Normal';
    }
  } catch (error) {
    console.error('Error determining status for trend:', error);
  }
  return 'Unknown';
}

function calculateTrend(data) {
  if (data.length < 2) return 'Stable';
  
  const firstValue = data[0].value;
  const lastValue = data[data.length - 1].value;
  const change = ((lastValue - firstValue) / firstValue) * 100;
  
  if (Math.abs(change) < 5) return 'Stable';
  return change > 0 ? 'Increasing' : 'Decreasing';
}

function generateInsights(parameter, data) {
  const insights = [];
  const currentValue = data[data.length - 1].value;
  const currentStatus = data[data.length - 1].status;
  
  // Status-based insights
  if (currentStatus !== 'Normal') {
    const severity = getSeverity(currentValue, parameter.normalRange);
    insights.push({
      type: currentStatus === 'High' ? 'warning' : 'caution',
      message: `${parameter.name} is ${currentStatus.toLowerCase()} (${severity} deviation from normal range)`
    });
  } else {
    insights.push({
      type: 'success',
      message: `${parameter.name} is within normal range`
    });
  }

  // Trend-based insights
  const trend = calculateTrend(data);
  if (trend !== 'Stable') {
    insights.push({
      type: 'info',
      message: `${parameter.name} shows a ${trend.toLowerCase()} trend over the last 6 months`
    });
  }

  // Parameter-specific insights
  const specificInsights = getParameterSpecificInsights(parameter.name, currentValue, currentStatus);
  insights.push(...specificInsights);

  return insights;
}

function getSeverity(value, normalRange) {
  try {
    if (normalRange.includes('-')) {
      const [min, max] = normalRange.split('-').map(v => parseFloat(v));
      const midpoint = (min + max) / 2;
      const range = max - min;
      const deviation = Math.abs(value - midpoint) / range;
      
      if (deviation > 0.5) return 'significant';
      if (deviation > 0.25) return 'moderate';
      return 'mild';
    }
  } catch (error) {
    console.error('Error calculating severity:', error);
  }
  return 'moderate';
}

function getParameterSpecificInsights(paramName, value, status) {
  const insights = [];
  
  switch (paramName) {
    case 'Glucose':
      if (status === 'High') {
        insights.push({
          type: 'warning',
          message: 'Consider monitoring carbohydrate intake and consult with healthcare provider'
        });
      }
      break;
    case 'Cholesterol':
      if (status === 'High') {
        insights.push({
          type: 'info',
          message: 'Diet modifications and regular exercise may help improve cholesterol levels'
        });
      }
      break;
    case 'Vitamin D':
      if (status === 'Low') {
        insights.push({
          type: 'info',
          message: 'Consider increasing sun exposure or vitamin D supplementation'
        });
      }
      break;
    default:
      break;
  }
  
  return insights;
}

module.exports = {
  generateTrendData,
  generateParameterTrend,
  calculateTrend,
  generateInsights
};
