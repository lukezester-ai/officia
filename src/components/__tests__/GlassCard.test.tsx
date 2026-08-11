import { render, screen } from '@testing-library/react';
import GlassCard from '../GlassCard';

describe('GlassCard', () => {
  it('renders children content', () => {
    render(
      <GlassCard className="test-class">
        <div data-testid="child">Hello World</div>
      </GlassCard>
    );
    const child = screen.getByTestId('child');
    expect(child).toBeInTheDocument();
    expect(child).toHaveTextContent('Hello World');
  });
});
