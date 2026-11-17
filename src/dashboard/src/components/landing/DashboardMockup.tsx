import { useEffect, useRef, useState } from "react";

const SidebarItem = ({ label, active = false }: { label: string; active?: boolean }) => (
  <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-[7px] ${active ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-600'}`}>
    <div className={`w-2.5 h-2.5 rounded ${active ? 'bg-primary/20' : 'bg-gray-200'}`} />
    {label}
  </div>
);

const SidebarSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mt-2">
    <p className="text-[6px] uppercase text-gray-400 font-semibold px-3 mb-1">{title}</p>
    {children}
  </div>
);

const SparklineSVG = ({ color, d }: { color: string; d: string }) => (
  <svg viewBox="0 0 80 20" className="w-full h-5" preserveAspectRatio="none">
    <defs>
      <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.15" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d={d + " L80,20 L0,20 Z"} fill={`url(#sg-${color.replace('#','')})`} />
    <path d={d} fill="none" stroke={color} strokeWidth="1.5" />
  </svg>
);

const MetricCardMock = ({ title, value, color, sparkline }: { title: string; value: string; color: string; sparkline: string }) => (
  <div className="bg-white rounded-lg border shadow-sm overflow-hidden" style={{ borderTopWidth: 2, borderTopColor: color }}>
    <div className="p-2 pb-0">
      <p className="text-[6px] text-gray-500">{title}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
    <SparklineSVG color={color} d={sparkline} />
  </div>
);

const BAR_HEIGHTS = [35, 55, 25, 70, 45, 80, 30, 60, 50, 40, 65, 75];

export function DashboardMockup() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200 w-full transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ fontSize: '10px' }}
    >
      <div className="flex h-[340px] sm:h-[380px] lg:h-[420px]">
        {/* Sidebar */}
        <div className="hidden md:flex flex-col w-[140px] bg-gray-50 border-r shrink-0">
          <div className="px-3 py-3 border-b">
            <p className="text-[10px] font-bold text-primary">FREE Payment Gateways</p>
          </div>
          <div className="px-2 py-2">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded text-[7px] text-gray-700">
              <div className="w-4 h-4 rounded bg-primary/20" />
              <span>My Brand</span>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <SidebarItem label="Dashboard" active />
            <SidebarSection title="Management">
              <SidebarItem label="Gateways" />
              <SidebarItem label="Customers" />
              <SidebarItem label="Transactions" />
              <SidebarItem label="Invoices" />
              <SidebarItem label="Payment Links" />
            </SidebarSection>
            <SidebarSection title="Reports">
              <SidebarItem label="Reports" />
              <SidebarItem label="MFS Transactions" />
            </SidebarSection>
            <SidebarSection title="System">
              <SidebarItem label="Devices" />
              <SidebarItem label="API Keys" />
              <SidebarItem label="Settings" />
            </SidebarSection>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <div className="flex items-center justify-between px-3 py-2 border-b bg-white">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 rounded" />
              <span className="text-[8px] font-semibold text-gray-700">Dashboard</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-primary/20" />
              <span className="text-[7px] text-gray-500">Owner</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-3 bg-gray-50/50 overflow-hidden space-y-3">
            {/* Metric cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <MetricCardMock title="Total Payments" value="4" color="#3B82F6" sparkline="M0,15 L10,12 L20,14 L30,8 L40,10 L50,6 L60,9 L70,4 L80,7" />
              <MetricCardMock title="Pending Payments" value="2" color="#EF4444" sparkline="M0,10 L10,14 L20,8 L30,12 L40,15 L50,10 L60,13 L70,11 L80,14" />
              <MetricCardMock title="Unpaid Invoices" value="0" color="#22C55E" sparkline="M0,15 L10,15 L20,15 L30,15 L40,15 L50,15 L60,15 L70,15 L80,15" />
              <MetricCardMock title="Pending SMS Data" value="2" color="#8B5CF6" sparkline="M0,12 L10,8 L20,14 L30,6 L40,10 L50,12 L60,5 L70,9 L80,7" />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
              {/* Payment Statistics with animated bars */}
              <div className="lg:col-span-2 bg-white rounded-lg border p-2">
                <p className="text-[7px] font-semibold text-gray-700 mb-2">Payment Statistics</p>
                <div className="h-28 flex items-end gap-[3px] px-1">
                  {BAR_HEIGHTS.map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-[1px]">
                      <div
                        className="w-full rounded-t bg-primary/70 transition-all duration-700 ease-out"
                        style={{
                          height: isVisible ? `${h}%` : '0%',
                          transitionDelay: `${300 + i * 80}ms`,
                        }}
                      />
                      <div
                        className="w-full rounded-t bg-red-400/50 transition-all duration-700 ease-out"
                        style={{
                          height: isVisible ? `${Math.max(5, h * 0.3)}%` : '0%',
                          transitionDelay: `${300 + i * 80 + 100}ms`,
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-1 px-1">
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m => (
                    <span key={m} className="text-[5px] text-gray-400">{m}</span>
                  ))}
                </div>
              </div>

              {/* Gateway Pie */}
              <div className="bg-white rounded-lg border p-2">
                <p className="text-[7px] font-semibold text-gray-700 mb-2">Gateway Distribution</p>
                <div className="flex items-center justify-center h-28">
                  <svg viewBox="0 0 36 36" className="w-20 h-20">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none" stroke="#E91E63" strokeWidth="3"
                      strokeDasharray="60 40" strokeDashoffset="25"
                      className="transition-all duration-1000 ease-out"
                      style={{ opacity: isVisible ? 1 : 0 }}
                    />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none" stroke="#FF9800" strokeWidth="3"
                      strokeDasharray="25 75" strokeDashoffset="65"
                      className="transition-all duration-1000 ease-out"
                      style={{ opacity: isVisible ? 1 : 0, transitionDelay: '300ms' }}
                    />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none" stroke="#4CAF50" strokeWidth="3"
                      strokeDasharray="15 85" strokeDashoffset="90"
                      className="transition-all duration-1000 ease-out"
                      style={{ opacity: isVisible ? 1 : 0, transitionDelay: '600ms' }}
                    />
                  </svg>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                  {[{c:'#E91E63',l:'bKash'},{c:'#FF9800',l:'Nagad'},{c:'#4CAF50',l:'Rocket'}].map(g => (
                    <div key={g.l} className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: g.c}} />
                      <span className="text-[6px] text-gray-500">{g.l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {/* Latest Payments */}
              <div className="bg-white rounded-lg border p-2">
                <p className="text-[7px] font-semibold text-gray-700 mb-2">Latest Payments</p>
                <div className="space-y-1">
                  {[
                    { amount: '৳500', gateway: 'bKash', status: 'Completed' },
                    { amount: '৳1,200', gateway: 'Nagad', status: 'Pending' },
                    { amount: '৳350', gateway: 'Rocket', status: 'Completed' },
                  ].map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-gray-100" />
                        <span className="text-[6px] text-gray-600">{p.gateway}</span>
                      </div>
                      <span className="text-[7px] font-semibold">{p.amount}</span>
                      <span className={`text-[5px] px-1 py-0.5 rounded-full ${p.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{p.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Device Status */}
              <div className="bg-white rounded-lg border p-2">
                <p className="text-[7px] font-semibold text-gray-700 mb-2">Device Status</p>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <div className="w-6 h-6 rounded bg-green-100 flex items-center justify-center">
                    <div className="w-3 h-3 rounded bg-green-400" />
                  </div>
                  <div>
                    <p className="text-[7px] font-semibold">My Android Device</p>
                    <p className="text-[5px] text-gray-400">Samsung SM-A125F • Last seen: 2 min ago</p>
                  </div>
                  <span className="ml-auto text-[5px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
