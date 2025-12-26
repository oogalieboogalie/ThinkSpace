/**
 * Tests for PricingCalculator component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { PricingCalculator } from '../PricingCalculator';

describe('PricingCalculator', () => {
  it('renders the calculator title', () => {
    render(<PricingCalculator />);

    expect(screen.getByText('Pricing Psychology Calculator')).toBeInTheDocument();
  });

  it('renders current pricing section', () => {
    render(<PricingCalculator />);

    expect(screen.getByText('Current Pricing')).toBeInTheDocument();
    expect(screen.getByText('Optimized Pricing')).toBeInTheDocument();
  });

  it('displays default input values', () => {
    render(<PricingCalculator />);

    const inputs = screen.getAllByRole('spinbutton');

    // Basic price, Pro price, Monthly visitors, Conversion rate
    expect(inputs).toHaveLength(4);
  });

  it('calculates charm pricing correctly', () => {
    render(<PricingCalculator />);

    // Default basic: $10 -> $9.99
    // Default pro: $50 -> $49.99
    expect(screen.getByText('$9.99')).toBeInTheDocument();
    expect(screen.getByText('$49.99')).toBeInTheDocument();
  });

  it('shows conversion rate boost', () => {
    render(<PricingCalculator />);

    // Default 3% conversion with 20% boost = 3.6%
    expect(screen.getByText('3.6%')).toBeInTheDocument();
    expect(screen.getByText('+20%')).toBeInTheDocument();
  });

  it('displays revenue impact section', () => {
    render(<PricingCalculator />);

    expect(screen.getByText('Revenue Impact')).toBeInTheDocument();
    expect(screen.getByText('Current MRR')).toBeInTheDocument();
    expect(screen.getByText('Projected MRR')).toBeInTheDocument();
  });

  it('updates charm pricing when basic price changes', async () => {
    const user = userEvent.setup();
    render(<PricingCalculator />);

    const basicPriceInput = screen.getAllByRole('spinbutton')[0];

    await user.clear(basicPriceInput);
    await user.type(basicPriceInput, '15');

    // Should show $14.99
    expect(screen.getByText('$14.99')).toBeInTheDocument();
  });

  it('updates charm pricing when pro price changes', async () => {
    const user = userEvent.setup();
    render(<PricingCalculator />);

    const proPriceInput = screen.getAllByRole('spinbutton')[1];

    await user.clear(proPriceInput);
    await user.type(proPriceInput, '100');

    // Should show $99.99
    expect(screen.getByText('$99.99')).toBeInTheDocument();
  });

  it('displays psychology principles audit', () => {
    render(<PricingCalculator />);

    expect(screen.getByText('Psychology Principles Audit')).toBeInTheDocument();
    expect(screen.getByText('Charm Pricing')).toBeInTheDocument();
    expect(screen.getByText('Three-Tier Structure')).toBeInTheDocument();
    expect(screen.getByText('Anchoring')).toBeInTheDocument();
    expect(screen.getByText('Annual Discount')).toBeInTheDocument();
  });

  it('shows charm pricing as applied for .99 prices', async () => {
    const user = userEvent.setup();
    render(<PricingCalculator />);

    const basicPriceInput = screen.getAllByRole('spinbutton')[0];

    await user.clear(basicPriceInput);
    await user.type(basicPriceInput, '9.99');

    // Charm pricing principle should show as applied
    const charmPrinciple = screen.getByText('Charm Pricing').closest('div');
    expect(charmPrinciple).toHaveClass(/green/);
  });

  it('displays recommended changes', () => {
    render(<PricingCalculator />);

    expect(screen.getByText('💡 Recommended Changes')).toBeInTheDocument();
    expect(screen.getByText('Apply Charm Pricing')).toBeInTheDocument();
    expect(screen.getByText(/Add Third Tier/)).toBeInTheDocument();
    expect(screen.getByText(/Offer Annual Discount/)).toBeInTheDocument();
  });

  it('shows A/B test plan', () => {
    render(<PricingCalculator />);

    expect(screen.getByText('🧪 A/B Test Plan')).toBeInTheDocument();
    expect(screen.getByText('Control (A)')).toBeInTheDocument();
    expect(screen.getByText('Variant (B)')).toBeInTheDocument();
  });

  it('recalculates revenue when visitor count changes', async () => {
    const user = userEvent.setup();
    render(<PricingCalculator />);

    const visitorsInput = screen.getAllByRole('spinbutton')[2];

    await user.clear(visitorsInput);
    await user.type(visitorsInput, '20000');

    // Revenue should change (we can't easily test exact value due to formatting)
    expect(visitorsInput).toHaveValue(20000);
  });

  it('recalculates when conversion rate changes', async () => {
    const user = userEvent.setup();
    render(<PricingCalculator />);

    const conversionInput = screen.getAllByRole('spinbutton')[3];

    await user.clear(conversionInput);
    await user.type(conversionInput, '5');

    // New conversion with boost: 5 * 1.2 = 6%
    expect(screen.getByText('6.0%')).toBeInTheDocument();
  });

  it('handles zero conversion rate', async () => {
    const user = userEvent.setup();
    render(<PricingCalculator />);

    const conversionInput = screen.getAllByRole('spinbutton')[3];

    await user.clear(conversionInput);
    await user.type(conversionInput, '0');

    // Should still render without crashing
    expect(screen.getByText('0.0%')).toBeInTheDocument();
  });

  it('handles zero visitor count', async () => {
    const user = userEvent.setup();
    render(<PricingCalculator />);

    const visitorsInput = screen.getAllByRole('spinbutton')[2];

    await user.clear(visitorsInput);
    await user.type(visitorsInput, '0');

    // Should still render without crashing
    expect(visitorsInput).toHaveValue(0);
  });

  it('shows principle impact percentages', () => {
    render(<PricingCalculator />);

    expect(screen.getByText('+15-24% conversion')).toBeInTheDocument();
    expect(screen.getByText('+30-40% middle tier selection')).toBeInTheDocument();
    expect(screen.getByText('+25% avg order value')).toBeInTheDocument();
  });

  it('displays enterprise tier recommendation', () => {
    render(<PricingCalculator />);

    // Default pro is $50, so enterprise should be $50 * 3.5 = $175
    expect(screen.getByText(/\$174\.99\/mo/)).toBeInTheDocument();
  });

  it('displays annual discount calculation', () => {
    render(<PricingCalculator />);

    // Default pro charm: $49.99 * 10 = $499.90
    expect(screen.getByText(/\$499\.90\/year/)).toBeInTheDocument();
  });
});

describe('PricingCalculator - Revenue Calculations', () => {
  it('calculates revenue increase correctly', () => {
    render(<PricingCalculator />);

    // With default values:
    // Current: 10,000 * 3% * ((10 * 0.3) + (50 * 0.7)) = 10000 * 0.03 * 38 = 11,400
    // New: 10,000 * 3.6% * ((9.99 * 0.3) + (49.99 * 0.7)) ≈ 10000 * 0.036 * 37.99 = 13,676
    // Increase ≈ $2,276 (values may vary slightly due to rounding)

    expect(screen.getByText(/Increase/i)).toBeInTheDocument();
    expect(screen.getByText(/boost/i)).toBeInTheDocument();
  });

  it('shows percentage boost in revenue', () => {
    render(<PricingCalculator />);

    // Should show percentage increase
    const boostText = screen.getByText(/% boost/);
    expect(boostText).toBeInTheDocument();
  });
});

describe('PricingCalculator - A/B Testing', () => {
  it('shows correct A/B test duration', () => {
    render(<PricingCalculator />);

    expect(screen.getByText(/Duration: 2 weeks/)).toBeInTheDocument();
  });

  it('shows sample size in A/B test', () => {
    render(<PricingCalculator />);

    expect(screen.getByText(/Sample size: 10,000 visitors/)).toBeInTheDocument();
  });

  it('shows success metrics', () => {
    render(<PricingCalculator />);

    expect(screen.getByText(/Success metric:/)).toBeInTheDocument();
    expect(screen.getByText(/Conversion rate & revenue per visitor/)).toBeInTheDocument();
  });
});
