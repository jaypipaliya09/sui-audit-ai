import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How It Works — SuiAudit AI',
  description: 'Learn how SuiAudit AI analyzes your Sui Move smart contract using Claude Sonnet 4.',
};

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
