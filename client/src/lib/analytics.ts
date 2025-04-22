// Simple analytics service to track pageviews
// In a production environment, you would use a proper analytics service
// like Google Analytics, Plausible, or a backend database

interface VisitData {
  timestamp: number;
  page: string;
  referrer?: string;
}

interface AnalyticsData {
  visits: VisitData[];
  uniqueVisitors: string[]; // Array of visitor IDs (simplified)
}

// Generate a simple visitor ID based on some browser characteristics
// Note: This is not a reliable way to identify unique users in production
const generateVisitorId = (): string => {
  const nav = window.navigator;
  const screen = window.screen;
  const navString = nav.userAgent + nav.language + nav.hardwareConcurrency;
  const screenString = screen.colorDepth + screen.width + screen.height + screen.pixelDepth;
  
  // Create a simple hash
  let hash = 0;
  const str = navString + screenString;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
};

// Get analytics data from localStorage
const getAnalyticsData = (): AnalyticsData => {
  try {
    const data = localStorage.getItem('sol_portfolio_analytics');
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading analytics data:', error);
  }
  return { visits: [], uniqueVisitors: [] };
};

// Save analytics data to localStorage
const saveAnalyticsData = (data: AnalyticsData): void => {
  try {
    localStorage.setItem('sol_portfolio_analytics', JSON.stringify(data));
  } catch (error) {
    console.error('Error saving analytics data:', error);
  }
};

// Record a page view
export const recordPageView = (page: string): void => {
  const data = getAnalyticsData();
  const visitorId = generateVisitorId();
  
  // Add visit
  const visitData: VisitData = {
    timestamp: Date.now(),
    page,
    referrer: document.referrer || undefined
  };
  
  data.visits.push(visitData);
  
  // Add unique visitor if not already tracked
  if (!data.uniqueVisitors.includes(visitorId)) {
    data.uniqueVisitors.push(visitorId);
  }
  
  saveAnalyticsData(data);
};

// Get analytics summary
export const getAnalyticsSummary = () => {
  const data = getAnalyticsData();
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const weekMs = 7 * dayMs;
  
  // Today's visits
  const todayVisits = data.visits.filter(
    visit => (now - visit.timestamp) < dayMs
  );
  
  // Weekly visits
  const weeklyVisits = data.visits.filter(
    visit => (now - visit.timestamp) < weekMs
  );
  
  // Calculate unique visitors
  const uniqueToday = new Set(
    todayVisits.map(visit => generateVisitorId())
  ).size;
  
  const uniqueWeekly = new Set(
    weeklyVisits.map(visit => generateVisitorId())
  ).size;
  
  return {
    totalPageViews: data.visits.length,
    totalUniqueVisitors: data.uniqueVisitors.length,
    todayPageViews: todayVisits.length,
    todayUniqueVisitors: uniqueToday,
    weeklyPageViews: weeklyVisits.length,
    weeklyUniqueVisitors: uniqueWeekly,
    // Most visited pages
    popularPages: getMostVisitedPages(data.visits),
    // Visits by day
    visitsByDay: getVisitsByDay(data.visits)
  };
};

// Helper to get most visited pages
const getMostVisitedPages = (visits: VisitData[]) => {
  const pageCount: Record<string, number> = {};
  
  visits.forEach(visit => {
    pageCount[visit.page] = (pageCount[visit.page] || 0) + 1;
  });
  
  return Object.entries(pageCount)
    .map(([page, count]) => ({ page, count }))
    .sort((a, b) => b.count - a.count);
};

// Helper to get visits grouped by day
const getVisitsByDay = (visits: VisitData[]) => {
  const visitsByDay: Record<string, number> = {};
  
  visits.forEach(visit => {
    const date = new Date(visit.timestamp).toISOString().split('T')[0];
    visitsByDay[date] = (visitsByDay[date] || 0) + 1;
  });
  
  // Convert to array of { date, count } sorted by date
  return Object.entries(visitsByDay)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

// Admin authentication
// In a real app, you'd use a proper authentication system
const ADMIN_PASSWORD = 'solanaportfolio2024';

export const authenticateAdmin = (password: string): boolean => {
  return password === ADMIN_PASSWORD;
};

// Clear analytics data (for testing)
export const clearAnalyticsData = (): void => {
  localStorage.removeItem('sol_portfolio_analytics');
};