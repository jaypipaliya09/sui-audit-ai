import * as React from 'react';
import { Html, Head, Body, Container, Section, Text, Heading, Button, Hr } from '@react-email/components';

interface EmailVerifyEmailProps {
  verifyUrl: string;
  title?: string;
}

export const EmailVerifyEmail = ({ verifyUrl, title = 'Verify your email address' }: EmailVerifyEmailProps) => {
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
            
            <Heading style={{ fontSize: '20px' }}>{title}</Heading>
            <Text style={{ fontSize: '15px', color: '#3c3f44' }}>
              Please click the button below to complete the process.
            </Text>

            <Section style={{ textAlign: 'center' as const, marginTop: '32px', marginBottom: '32px' }}>
              <Button
                href={verifyUrl}
                style={{ backgroundColor: '#6366f1', borderRadius: '5px', color: '#fff', fontSize: '16px', fontWeight: 'bold', textDecoration: 'none', textAlign: 'center' as const, padding: '12px 24px' }}
              >
                Continue
              </Button>
            </Section>

            <Hr style={{ borderColor: '#cccccc', margin: '20px 0' }} />
            <Text style={{ fontSize: '12px', color: '#999999' }}>
              If you didn't request this email, there's nothing to worry about - you can safely ignore it.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default EmailVerifyEmail;
