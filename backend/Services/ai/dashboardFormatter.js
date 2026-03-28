function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function round1(value) {
  return Math.round(toNumber(value) * 10) / 10;
}

function percentChange(current, previous) {
  const currentNum = toNumber(current);
  const previousNum = toNumber(previous);

  if (previousNum === 0) {
    return null;
  }

  return round1(((currentNum - previousNum) / previousNum) * 100);
}

function safeDrop(fromValue, toValue) {
  const fromNum = toNumber(fromValue);
  const toNum = toNumber(toValue);

  if (fromNum <= 0) {
    return 0;
  }

  return round1(((fromNum - toNum) / fromNum) * 100);
}

function formatKpis(currentKpis, previousKpis, comparisonEnabled) {
  const metricNames = [
    "revenue",
    "orders",
    "aov",
    "conversionRate",
    "returningCustomerRate",
  ];

  return metricNames.reduce((acc, metric) => {
    const currentValue = toNumber(currentKpis && currentKpis[metric]);

    if (!comparisonEnabled) {
      acc[metric] = currentValue;
      return acc;
    }

    const hasPrevious = previousKpis && Object.prototype.hasOwnProperty.call(previousKpis, metric);
    const previousValue = hasPrevious ? toNumber(previousKpis[metric]) : null;

    acc[metric] = {
      current: currentValue,
      previous: previousValue,
      changePct: previousValue === null ? null : percentChange(currentValue, previousValue),
    };

    return acc;
  }, {});
}

function detectSpikesAndDrops(timeSeries) {
  const spikes = [];
  const drops = [];

  if (!Array.isArray(timeSeries) || timeSeries.length < 2) {
    return { spikes, drops };
  }

  for (let i = 1; i < timeSeries.length; i += 1) {
    const prevRevenue = toNumber(timeSeries[i - 1] && timeSeries[i - 1].revenue);
    const currentRevenue = toNumber(timeSeries[i] && timeSeries[i].revenue);

    if (prevRevenue === 0) {
      continue;
    }

    const change = ((currentRevenue - prevRevenue) / prevRevenue) * 100;
    const dateLabel = (timeSeries[i] && timeSeries[i].date) || `index-${i}`;
    const roundedChange = round1(change);

    if (change > 40) {
      spikes.push({
        date: dateLabel,
        changePct: roundedChange,
      });
    }

    if (change < -40) {
      drops.push({
        date: dateLabel,
        changePct: roundedChange,
      });
    }
  }

  return { spikes, drops };
}

function detectTrendDirection(timeSeries, spikes, drops) {
  if (!Array.isArray(timeSeries) || timeSeries.length < 2) {
    return "stable";
  }

  const first = toNumber(timeSeries[0] && timeSeries[0].revenue);
  const last = toNumber(timeSeries[timeSeries.length - 1] && timeSeries[timeSeries.length - 1].revenue);

  const deltas = [];
  for (let i = 1; i < timeSeries.length; i += 1) {
    const prev = toNumber(timeSeries[i - 1] && timeSeries[i - 1].revenue);
    const curr = toNumber(timeSeries[i] && timeSeries[i].revenue);
    deltas.push(curr - prev);
  }

  let directionChanges = 0;
  for (let i = 1; i < deltas.length; i += 1) {
    const prevDelta = deltas[i - 1];
    const currDelta = deltas[i];
    if ((prevDelta > 0 && currDelta < 0) || (prevDelta < 0 && currDelta > 0)) {
      directionChanges += 1;
    }
  }

  const anomalyCount = (Array.isArray(spikes) ? spikes.length : 0) + (Array.isArray(drops) ? drops.length : 0);

  if (anomalyCount >= 2 || directionChanges >= 2) {
    return "volatile";
  }

  if (last > first * 1.1) {
    return "growth";
  }

  if (last < first * 0.9) {
    return "decline";
  }

  return "stable";
}

function formatFunnel(funnel) {
  const visitors = toNumber(funnel && funnel.visitors);
  const addToCart = toNumber(funnel && funnel.addToCart);
  const checkout = toNumber(funnel && funnel.checkout);
  const purchase = toNumber(funnel && funnel.purchase);

  const visitorToCartDrop = safeDrop(visitors, addToCart);
  const cartToCheckoutDrop = safeDrop(addToCart, checkout);
  const checkoutToPurchaseDrop = safeDrop(checkout, purchase);

  const stages = {
    visitorToCartDrop,
    cartToCheckoutDrop,
    checkoutToPurchaseDrop,
  };

  let bottleneck = "visitorToCartDrop";
  let highestDrop = stages[bottleneck];

  Object.keys(stages).forEach((key) => {
    if (stages[key] > highestDrop) {
      highestDrop = stages[key];
      bottleneck = key;
    }
  });

  return {
    visitorToCartDrop,
    cartToCheckoutDrop,
    checkoutToPurchaseDrop,
    bottleneck,
  };
}

function getTopCategory(categories) {
  if (!Array.isArray(categories) || categories.length === 0) {
    return { name: "none", share: 0 };
  }

  let top = categories[0] || { name: "unknown", revenue: 0 };
  let totalRevenue = 0;

  categories.forEach((category) => {
    const revenue = toNumber(category && category.revenue);
    totalRevenue += revenue;

    if (revenue > toNumber(top && top.revenue)) {
      top = category;
    }
  });

  const topRevenue = toNumber(top && top.revenue);
  const share = totalRevenue > 0 ? round1((topRevenue / totalRevenue) * 100) : 0;

  return {
    name: (top && top.name) || "unknown",
    share,
  };
}

function getTopRegion(regions) {
  if (!Array.isArray(regions) || regions.length === 0) {
    return "unknown";
  }

  let top = regions[0] || { name: "unknown", revenue: 0 };

  regions.forEach((region) => {
    if (toNumber(region && region.revenue) > toNumber(top && top.revenue)) {
      top = region;
    }
  });

  return (top && top.name) || "unknown";
}

function pickPrimaryDriver(currentKpis) {
  const revenue = toNumber(currentKpis && currentKpis.revenue);
  const orders = toNumber(currentKpis && currentKpis.orders);
  const aov = toNumber(currentKpis && currentKpis.aov);

  if (orders > 0 && aov > revenue / orders) {
    return "aov";
  }

  if (orders > 0) {
    return "orders";
  }

  return "revenue";
}

function detectMainIssue(funnel, conversionRate) {
  if (toNumber(funnel && funnel.visitorToCartDrop) > 80) {
    return "low_intent_or_product_issue";
  }

  if (toNumber(funnel && funnel.cartToCheckoutDrop) > 40) {
    return "checkout_friction";
  }

  if (toNumber(conversionRate) < 3) {
    return "low_conversion";
  }

  return "none";
}

module.exports = function formatDashboardData(input) {
  const data = input || {};
  const current = data.current || {};
  const previous = data.previous || null;
  const filters = data.filters || {};
  const comparisonEnabled = Boolean(data.comparisonEnabled);

  const currentKpis = current.kpis || {};
  const previousKpis = previous && previous.kpis ? previous.kpis : null;

  const timeSeries = Array.isArray(current.timeSeries) ? current.timeSeries : [];
  const anomalyInfo = detectSpikesAndDrops(timeSeries);
  const trendDirection = detectTrendDirection(timeSeries, anomalyInfo.spikes, anomalyInfo.drops);

  const funnel = formatFunnel(current.funnel || {});

  const categories = current.breakdowns && Array.isArray(current.breakdowns.categories)
    ? current.breakdowns.categories
    : [];
  const regions = current.breakdowns && Array.isArray(current.breakdowns.regions)
    ? current.breakdowns.regions
    : [];
  const devices = current.breakdowns && current.breakdowns.devices ? current.breakdowns.devices : {};

  const topCategory = getTopCategory(categories);
  const topRegion = getTopRegion(regions);

  const conversionRate = toNumber(currentKpis.conversionRate);
  const returningRate = toNumber(currentKpis.returningCustomerRate);

  return {
    context: {
      timeframe: filters.timeframe || "",
      filters: {
        region: filters.region || "",
        device: filters.device || "",
      },
      comparison: {
        enabled: comparisonEnabled,
      },
    },

    kpis: formatKpis(currentKpis, previousKpis, comparisonEnabled),

    trend: {
      direction: trendDirection,
      spikes: anomalyInfo.spikes,
      drops: anomalyInfo.drops,
    },

    funnel,

    breakdowns: {
      topCategory,
      topRegion,
      deviceSplit: {
        mobile: toNumber(devices.mobile),
        desktop: toNumber(devices.desktop),
        tablet: toNumber(devices.tablet),
      },
    },

    dataQuality: {
      hasEnoughData: timeSeries.length > 5,
      hasComparison: comparisonEnabled,
    },

    derived: {
      primaryDriver: pickPrimaryDriver(currentKpis),
      conversionHealth: conversionRate < 3 ? "weak" : "good",
      retentionHealth: returningRate > 30 ? "good" : "weak",
      concentrationRisk: topCategory.share > 60 ? "high" : topCategory.share > 40 ? "medium" : "low",
      mainIssue: detectMainIssue(funnel, conversionRate),
    },
  };
};