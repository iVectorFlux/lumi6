import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Users, TrendingUp } from 'lucide-react';
import { StatsCards, StatCard } from '@/components/dashboard/StatsCards';

describe('StatCard', () => {
  it('renders basic stat card correctly', () => {
    render(
      <StatCard
        title="Total Users"
        value={150}
        color="blue"
      />
    );

    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('renders stat card with icon', () => {
    render(
      <StatCard
        title="Active Users"
        value="1,234"
        icon={Users}
        color="green"
      />
    );

    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('renders stat card with trend', () => {
    render(
      <StatCard
        title="Revenue"
        value="$45,231"
        trend={{ value: 12, isPositive: true }}
        color="purple"
      />
    );

    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('$45,231')).toBeInTheDocument();
    expect(screen.getByText(/12% from last month/)).toBeInTheDocument();
    expect(screen.getByText('↗')).toBeInTheDocument();
  });

  it('renders negative trend correctly', () => {
    render(
      <StatCard
        title="Bounces"
        value="8.5%"
        trend={{ value: 5, isPositive: false }}
        color="red"
      />
    );

    expect(screen.getByText(/5% from last month/)).toBeInTheDocument();
    expect(screen.getByText('↘')).toBeInTheDocument();
  });
});

describe('StatsCards', () => {
  const mockStats = [
    {
      title: 'Total Candidates',
      value: 245,
      icon: Users,
      color: 'blue' as const,
    },
    {
      title: 'Growth Rate',
      value: '15.3%',
      icon: TrendingUp,
      color: 'green' as const,
      trend: { value: 8, isPositive: true },
    },
  ];

  it('renders multiple stat cards', () => {
    render(<StatsCards stats={mockStats} />);

    expect(screen.getByText('Total Candidates')).toBeInTheDocument();
    expect(screen.getByText('245')).toBeInTheDocument();
    expect(screen.getByText('Growth Rate')).toBeInTheDocument();
    expect(screen.getByText('15.3%')).toBeInTheDocument();
  });

  it('shows loading skeleton when loading', () => {
    render(<StatsCards stats={mockStats} loading={true} />);

    // Should render skeleton components instead of actual stats
    expect(screen.queryByText('Total Candidates')).not.toBeInTheDocument();
    expect(screen.queryByText('Growth Rate')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <StatsCards stats={mockStats} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles empty stats array', () => {
    render(<StatsCards stats={[]} />);

    expect(screen.queryByText('Total Candidates')).not.toBeInTheDocument();
  });
}); 