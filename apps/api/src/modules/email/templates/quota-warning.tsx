import * as React from 'react';
import { Html, Head, Body, Container, Section, Text, Heading, Button, Hr } from '@react-email/components';

interface QuotaWarningEmailProps {
  used: number;
  limit: number;
  resetDate: string;
  upgradeUrl: string;
  exceeded?: boolean;
}

export const QuotaWarningEmail = ({ used, limit, resetDate, upgradeUrl, exceeded }: QuotaWarningEmailProps) => {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f6f9fc', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif' }}>
        <Container style={{ backgroundColor: '#ffffff', margin: '0 auto', padding: '20px 0 48px', marginBottom: '64px' }}>
          <Section style={{ padding: '0 48px' }}>
            <Heading style={{ fontSize: '24px', letterSpacing: '-0.5px', lineHeight: '1.3', fontWeight: '400', color: '#484848', padding: '17px 0 0' }}>
              MoveAuditor
            </Heading>
            <Hr style={{ borderColor: '#cccccc', margin: '20px 0' }} />
            
            <Heading style={{ fontSize: '20px', color: exceeded ? '#dc2626' : '#ea580c' }}>
              {exceeded ? 'Audit Quota Exceeded' : 'Approaching Audit Limit'}
            </Heading>
            
            <Text style={{ fontSize: '15px', color: '#3c3f44' }}>
              {exceeded 
                ? 'You have reached your audit limit for the current billing period. New audits are paused.'
                : 'You are approaching your audit limit for the current billing period.'}
            </Text>

            <Section style={{ margin: '20px 0' }}>
              <div style={{ backgroundColor: '#f3f4f6', height: '8px', borderRadius: '4px', width: '100%', overflow: 'hidden' }}>
                <div style={{ backgroundColor: exceeded ? '#dc2626' : '#ea580c', height: '100%', width: `${pct}%` }} />
              </div>
              <Text style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px', textAlign: 'center' as const }}>
                {used} / {limit} audits used ({pct}%)
              </Text>
            </Section>

            <Text style={{ fontSize: '15px', color: '#3c3f44' }}>
              Your quota will reset on {new Date(resetDate).toLocaleDateString()}.
            </Text>

            <Section style={{ textAlign: 'center' as const, marginTop: '32px', marginBottom: '32px' }}>
              <Button
                href={upgradeUrl}
                style={{ backgroundColor: '#6366f1', borderRadius: '5px', color: '#fff', fontSize: '16px', fontWeight: 'bold', textDecoration: 'none', textAlign: 'center' as const, padding: '12px 24px' }}
              >
                Upgrade Plan
              </Button>
            </Section>

            <Hr style={{ borderColor: '#cccccc', margin: '20px 0' }} />
            <Text style={{ fontSize: '12px', color: '#999999' }}>
              Sent by MoveAuditor
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default QuotaWarningEmail;
