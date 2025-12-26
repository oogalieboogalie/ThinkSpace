import { useState } from 'react';
import { DollarSign, TrendingUp, Lightbulb, CheckCircle, AlertCircle } from 'lucide-react';

export function PricingCalculator() {
  const [basicPrice, setBasicPrice] = useState(10.00);
  const [proPrice, setProPrice] = useState(50.00);
  const [monthlyVisitors, setMonthlyVisitors] = useState(10000);
  const [currentConversion, setCurrentConversion] = useState(3);

  // Apply charm pricing
  const charmBasic = Math.floor(basicPrice) - 0.01;
  const charmPro = Math.floor(proPrice) - 0.01;

  // Calculate impact of charm pricing (15-24% boost)
  const charmConversionBoost = 0.20; // Conservative 20%
  const newConversion = currentConversion * (1 + charmConversionBoost);

  // Calculate revenue
  const currentRevenue = monthlyVisitors * (currentConversion / 100) * ((basicPrice * 0.3) + (proPrice * 0.7));
  const newRevenue = monthlyVisitors * (newConversion / 100) * ((charmBasic * 0.3) + (charmPro * 0.7));
  const revenueIncrease = newRevenue - currentRevenue;

  // Psychology principles check
  const principles = [
    {
      name: 'Charm Pricing',
      applied: basicPrice % 1 !== 0 || proPrice % 1 !== 0,
      impact: '+15-24% conversion',
      description: 'Prices ending in .99 trigger left-digit bias'
    },
    {
      name: 'Three-Tier Structure',
      applied: false, // They only have 2 tiers
      impact: '+30-40% middle tier selection',
      description: 'Goldilocks effect - people avoid extremes'
    },
    {
      name: 'Anchoring',
      applied: false,
      impact: '+25% avg order value',
      description: 'High price makes lower prices seem reasonable'
    },
    {
      name: 'Annual Discount',
      applied: false,
      impact: '20-30% choose annual',
      description: 'Upfront cash + higher LTV'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <DollarSign className="text-green-400" />
          Pricing Psychology Calculator
        </h2>
        <p className="text-muted-foreground mt-1">
          See real-time impact of psychological pricing tactics
        </p>
      </div>

      {/* Current Pricing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">Current Pricing</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Basic Tier</label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={basicPrice}
                  onChange={(e) => setBasicPrice(Number(e.target.value))}
                  className="flex-1 bg-muted text-foreground rounded px-3 py-2"
                />
                <span className="text-muted-foreground">/mo</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-2">Pro Tier</label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={proPrice}
                  onChange={(e) => setProPrice(Number(e.target.value))}
                  className="flex-1 bg-muted text-foreground rounded px-3 py-2"
                />
                <span className="text-muted-foreground">/mo</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-2">Monthly Visitors</label>
              <input
                type="number"
                value={monthlyVisitors}
                onChange={(e) => setMonthlyVisitors(Number(e.target.value))}
                className="w-full bg-muted text-foreground rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-2">Conversion Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={currentConversion}
                onChange={(e) => setCurrentConversion(Number(e.target.value))}
                className="w-full bg-muted text-foreground rounded px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Optimized Pricing */}
        <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-lg font-bold text-primary mb-4">✨ Optimized Pricing</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Basic Tier (Charm Pricing)</label>
              <div className="text-3xl font-bold text-green-400">
                ${charmBasic.toFixed(2)}<span className="text-lg text-muted-foreground">/mo</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-2">Pro Tier (Charm Pricing)</label>
              <div className="text-3xl font-bold text-green-400">
                ${charmPro.toFixed(2)}<span className="text-lg text-muted-foreground">/mo</span>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <label className="block text-sm text-muted-foreground mb-2">New Conversion Rate</label>
              <div className="text-3xl font-bold text-primary">
                {newConversion.toFixed(1)}%
                <span className="text-lg text-green-400 ml-2">
                  +{(charmConversionBoost * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Impact */}
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-green-400 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Revenue Impact
            </h3>
            <p className="text-muted-foreground text-sm mt-1">Monthly recurring revenue projection</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Increase</p>
            <p className="text-3xl font-bold text-green-400">
              +${revenueIncrease.toLocaleString(undefined, {maximumFractionDigits: 0})}
            </p>
            <p className="text-sm text-green-400">
              ({((revenueIncrease / currentRevenue) * 100).toFixed(0)}% boost)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-border">
          <div>
            <p className="text-muted-foreground text-sm">Current MRR</p>
            <p className="text-2xl font-bold text-foreground">
              ${currentRevenue.toLocaleString(undefined, {maximumFractionDigits: 0})}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Projected MRR</p>
            <p className="text-2xl font-bold text-primary">
              ${newRevenue.toLocaleString(undefined, {maximumFractionDigits: 0})}
            </p>
          </div>
        </div>
      </div>

      {/* Psychology Audit */}
      <div className="bg-card rounded-lg p-6">
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Lightbulb className="text-yellow-400" />
          Psychology Principles Audit
        </h3>

        <div className="space-y-3">
          {principles.map((principle, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg border ${
                principle.applied
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-orange-500/10 border-orange-500/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {principle.applied ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-orange-400" />
                    )}
                    <h4 className="font-bold text-foreground">{principle.name}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{principle.description}</p>
                </div>
                <div className={`text-sm font-bold ${
                  principle.applied ? 'text-green-400' : 'text-orange-400'
                }`}>
                  {principle.impact}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
        <h3 className="text-lg font-bold text-primary mb-4">💡 Recommended Changes</h3>

        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="text-2xl">1️⃣</div>
            <div>
              <p className="font-bold text-foreground">Apply Charm Pricing</p>
              <p className="text-sm text-muted-foreground mt-1">
                Change ${basicPrice} → ${charmBasic.toFixed(2)} and ${proPrice} → ${charmPro.toFixed(2)}
              </p>
              <p className="text-sm text-green-400 mt-1">
                Expected: +{(charmConversionBoost * 100).toFixed(0)}% conversion (+${revenueIncrease.toLocaleString()}/mo)
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="text-2xl">2️⃣</div>
            <div>
              <p className="font-bold text-foreground">Add Third Tier (Anchoring)</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add Enterprise tier at ${(proPrice * 3.5).toFixed(2)}/mo
              </p>
              <p className="text-sm text-primary mt-1">
                Makes ${charmPro.toFixed(2)} seem like the "smart choice" (70% will pick this)
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="text-2xl">3️⃣</div>
            <div>
              <p className="font-bold text-foreground">Offer Annual Discount</p>
              <p className="text-sm text-muted-foreground mt-1">
                ${charmPro.toFixed(2)}/mo or ${(charmPro * 10).toFixed(2)}/year (save 2 months!)
              </p>
              <p className="text-sm text-green-400 mt-1">
                20-30% will choose annual = better cash flow + retention
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* A/B Test Plan */}
      <div className="bg-card rounded-lg p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">🧪 A/B Test Plan</h3>

        <div className="space-y-4">
          <div>
            <p className="font-medium text-foreground">Test 1: Charm Pricing</p>
            <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
              <div className="bg-muted rounded p-3">
                <p className="text-muted-foreground">Control (A)</p>
                <p className="text-foreground font-bold">${basicPrice} / ${proPrice}</p>
              </div>
              <div className="bg-blue-500/20 rounded p-3">
                <p className="text-primary">Variant (B)</p>
                <p className="text-foreground font-bold">${charmBasic.toFixed(2)} / ${charmPro.toFixed(2)}</p>
              </div>
            </div>
            <div className="mt-2 text-sm text-muted-foreground space-y-1">
              <p>• Duration: 2 weeks</p>
              <p>• Sample size: {monthlyVisitors} visitors (50/50 split)</p>
              <p>• Success metric: Conversion rate & revenue per visitor</p>
              <p>• Expected result: +15-24% conversion (B wins)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
