import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { getAnalyticsSummary, authenticateAdmin } from '../lib/analytics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function Analytics() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [analytics, setAnalytics] = useState<any>(null);
  const [error, setError] = useState('');
  const [, navigate] = useLocation();

  const handleLogin = () => {
    if (authenticateAdmin(password)) {
      setIsAuthenticated(true);
      setError('');
      // Load analytics
      setAnalytics(getAnalyticsSummary());
    } else {
      setError('Invalid password');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-3xl mx-auto mb-8 mt-8">
        <Card className="bg-white dark:bg-gray-900 border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-semibold dark:text-white">Admin Authentication</CardTitle>
            <CardDescription className="dark:text-slate-400">Enter admin password to view analytics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
                {error && <p className="text-red-500 text-sm">{error}</p>}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => navigate('/')} className="dark:text-white dark:border-gray-700">
              Back to Home
            </Button>
            <Button onClick={handleLogin} className="bg-primary text-white">Login</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto mb-8 mt-8">
      <Card className="bg-white dark:bg-gray-900 border-0 shadow-md">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl font-semibold dark:text-white">Analytics Dashboard</CardTitle>
              <CardDescription className="dark:text-slate-400">Site traffic overview</CardDescription>
            </div>
            <Button variant="outline" onClick={() => navigate('/')} className="dark:text-white dark:border-gray-700">
              Back to Home
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Total Stats */}
            <MetricCard
              title="Total Visitors"
              value={analytics?.totalUniqueVisitors || 0}
              description="All time unique visitors"
              icon={<UserIcon />}
            />
            <MetricCard
              title="Total Views"
              value={analytics?.totalPageViews || 0}
              description="All time page views"
              icon={<EyeIcon />}
            />
            <MetricCard
              title="Today's Views"
              value={analytics?.todayPageViews || 0}
              description={`${analytics?.todayUniqueVisitors || 0} unique visitors today`}
              icon={<TodayIcon />}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Popular Pages */}
            <Card className="border dark:border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium dark:text-white">Popular Pages</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.popularPages && analytics.popularPages.length > 0 ? (
                  <div className="space-y-2">
                    {analytics.popularPages.map((page: any, index: number) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm font-medium truncate max-w-[70%] dark:text-slate-300">
                          {page.page || 'Home'}
                        </span>
                        <span className="text-sm dark:text-slate-400">{page.count} views</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No data available</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border dark:border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium dark:text-white">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.visitsByDay && analytics.visitsByDay.length > 0 ? (
                  <div className="space-y-2">
                    {analytics.visitsByDay.slice(-5).map((day: any, index: number) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm font-medium dark:text-slate-300">{day.date}</span>
                        <span className="text-sm dark:text-slate-400">{day.count} views</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Metric Card Component
function MetricCard({ title, value, description, icon }: any) {
  return (
    <Card className="border dark:border-gray-700">
      <CardContent className="pt-6">
        <div className="flex justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
            <p className="text-2xl font-bold mt-1 dark:text-white">{value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>
          </div>
          <div className="text-primary dark:text-primary/80">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Icons
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
);

const TodayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar-clock"><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h5"/><path d="M17.5 17.5 16 16.25V14"/><path d="M22 16a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z"/></svg>
);