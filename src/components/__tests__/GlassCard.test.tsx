import { render } from '@testing-library/react';
import GlassCard from '../GlassCard';

describe('GlassCard', () => {
  it('renders children content', () => {
  const { getByTestId } = render(
    <GlassCard className="test-class">
      <div data-testid="child">Hello World</div>
    </GlassCard>
  );
  const child = getByTestId('child');
    expect(child).toBeInTheDocument();
    expect(child).toHaveTextContent('Hello World');
  });
});
