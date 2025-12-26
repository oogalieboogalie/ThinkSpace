import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Zap } from 'lucide-react';

export function KFactorCalculator() {
  const [totalUsers, setTotalUsers] = useState(1000);
  const [invitesPerUser, setInvitesPerUser] = useState(3.0);
  const [conversionRate, setConversionRate] = useState(20);

  // Calculate K-factor
  const kFactor = (invitesPerUser * conversionRate) / 100;

  // Generate growth projection
  const months = 12;
  const projectionData = [];
  let currentUsers = totalUsers;

  for (let month = 0; month <= months; month++) {
    projectionData.push({
      month: `M${month}`,
      users: Math.round(currentUsers),
    });
    currentUsers = currentUsers * (1 + kFactor);
  }

  // Status determination
  const getStatus = () => {
    if (kFactor >= 1) return { text: 'Viral! 🚀', color: 'text-green-400', bg: 'bg-green-500/20' };
    if (kFactor >= 0.7) return { text: 'Strong 💪', color: 'text-primary', bg: 'bg-blue-500/20' };
    if (kFactor >= 0.4) return { text: 'Good 👍', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    return { text: 'Sub-viral ⚠️', color: 'text-orange-400', bg: 'bg-orange-500/20' };
  };

  const status = getStatus();

  // Calculate what's needed to reach K=1
  const targetK = 1.0;
  const neededInvites = (targetK * 100) / conversionRate;
  const neededConversion = (targetK * 100) / invitesPerUser;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Zap className="text-yellow-400" />
          K-Factor Calculator
        </h2>
        <p className="text-muted-foreground mt-1">
          Calculate your viral coefficient and project exponential growth
        </p>
      </div>

      {/* Input Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Users */}
        <div className="bg-card rounded-lg p-5">
          <label className="block text-sm font-medium text-foreground mb-3">
            <Users className="inline w-4 h-4 mr-2" />
            Total Users
          </label>
          <input
            type="number"
            value={totalUsers}
            onChange={(e) => setTotalUsers(Number(e.target.value))}
            className="w-full bg-muted text-foreground rounded px-3 py-2 mb-3"
          />
          <input
            type="range"
            min="100"
            max="100000"
            step="100"
            value={totalUsers}
            onChange={(e) => setTotalUsers(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Invites Per User */}
        <div className="bg-card rounded-lg p-5">
          <label className="block text-sm font-medium text-foreground mb-3">
            Invites Sent / User
          </label>
          <input
            type="number"
            step="0.1"
            value={invitesPerUser}
            onChange={(e) => setInvitesPerUser(Number(e.target.value))}
            className="w-full bg-muted text-foreground rounded px-3 py-2 mb-3"
          />
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={invitesPerUser}
            onChange={(e) => setInvitesPerUser(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Conversion Rate */}
        <div className="bg-card rounded-lg p-5">
          <label className="block text-sm font-medium text-foreground mb-3">
            Conversion Rate (%)
          </label>
          <input
            type="number"
            value={conversionRate}
            onChange={(e) => setConversionRate(Number(e.target.value))}
            className="w-full bg-muted text-foreground rounded px-3 py-2 mb-3"
          />
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={conversionRate}
            onChange={(e) => setConversionRate(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      {/* K-Factor Result */}
      <div className={`${status.bg} rounded-lg p-6 border border-border`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm mb-1">Your K-Factor</p>
            <p className="text-5xl font-bold text-foreground">{kFactor.toFixed(2)}</p>
          </div>
          <div className={`${status.color} text-2xl font-bold`}>
            {status.text}
          </div>
        </div>

        <div className="mt-4 text-sm text-foreground">
          {kFactor >= 1 ? (
            <p>🎉 You have viral growth! Each user brings {kFactor.toFixed(2)} new users.</p>
          ) : (
            <p>Each user brings {kFactor.toFixed(2)} new users. You need &gt;1 for true virality.</p>
          )}
        </div>
      </div>

      {/* Growth Projection Chart */}
      <div className="bg-card rounded-lg p-6">
        <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="text-primary" />
          12-Month Growth Projection
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={projectionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
              }}
            />
            <Line
              type="monotone"
              dataKey="users"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: '#3b82f6', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">Month 1</p>
            <p className="text-2xl font-bold text-foreground">
              {projectionData[1]?.users.toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground text-sm">Month 6</p>
            <p className="text-2xl font-bold text-foreground">
              {projectionData[6]?.users.toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground text-sm">Month 12</p>
            <p className="text-2xl font-bold text-foreground">
              {projectionData[12]?.users.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {kFactor < 1 && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-xl font-bold text-primary mb-4">
            💡 How to Reach K = 1.0 (Viral Growth)
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-foreground font-medium">Option 1: Increase Invites Per User</p>
              <p className="text-muted-foreground text-sm mt-1">
                Current: {invitesPerUser.toFixed(1)} → Target: <span className="text-primary font-bold">{neededInvites.toFixed(1)}</span>
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                • Add invite prompt after "aha moment"<br />
                • Make sharing core to product experience<br />
                • Gamify invites (leaderboard, badges)
              </p>
            </div>

            <div>
              <p className="text-foreground font-medium">Option 2: Increase Conversion Rate</p>
              <p className="text-muted-foreground text-sm mt-1">
                Current: {conversionRate}% → Target: <span className="text-primary font-bold">{neededConversion.toFixed(1)}%</span>
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                • Two-sided incentive (both users benefit)<br />
                • Reduce friction (one-click invite)<br />
                • Show social proof ("10 friends already joined")
              </p>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-foreground font-medium">Best Practice: Dropbox Example</p>
              <p className="text-muted-foreground text-sm mt-1">
                Dropbox achieved K = 0.7+ by giving <strong>500MB to both parties</strong>.<br />
                This reduced CAC to near $0 and drove 100K → 4M users in 15 months.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Benchmarks */}
      <div className="bg-card rounded-lg p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">📊 Industry Benchmarks</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">K &lt; 0.5</span>
            <span className="text-orange-400">Poor - Linear growth</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">K = 0.5 - 0.7</span>
            <span className="text-yellow-400">Good - Sustainable growth</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">K = 0.7 - 1.0</span>
            <span className="text-primary">Strong - Dropbox territory</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">K &gt; 1.0</span>
            <span className="text-green-400">Viral - Exponential growth 🚀</span>
          </div>
        </div>
      </div>
    </div>
  );
}
