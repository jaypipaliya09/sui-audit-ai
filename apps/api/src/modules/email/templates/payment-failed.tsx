import * as React from 'react';
import { Html, Head, Body, Container, Section, Text, Heading, Button, Hr } from '@react-email/components';

interface PaymentFailedEmailProps {
  amount: string;
  updatePaymentUrl: string;
}

export const PaymentFailedEmail = ({ amount, updatePaymentUrl }: PaymentFailedEmailProps) => {
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
            
            <Heading style={{ fontSize: '20px', color: '#dc2626' }}>Payment Failed</Heading>
            <Text style={{ fontSize: '15px', color: '#3c3f44' }}>
              We were unable to process your recent payment of <strong>{amount}</strong>.
            </Text>
            <Text style={{ fontSize: '15px', color: '#3c3f44' }}>
              To ensure your MoveAuditor service continues without interruption, please update your payment method as soon as possible.
            </Text>

            <Section style={{ textAlign: 'center' as const, marginTop: '32px', marginBottom: '32px' }}>
              <Button
                href={updatePaymentUrl}
                style={{ backgroundColor: '#dc2626', borderRadius: '5px', color: '#fff', fontSize: '16px', fontWeight: 'bold', textDecoration: 'none', textAlign: 'center' as const, padding: '12px 24px' }}
              >
                Update Payment Method
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

export default PaymentFailedEmail;
