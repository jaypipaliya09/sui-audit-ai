import * as React from 'react';
import { Html, Head, Body, Container, Section, Text, Heading, Hr } from '@react-email/components';

interface WelcomeEmailProps {
  name?: string;
}

export const WelcomeEmail = ({ name }: WelcomeEmailProps) => {
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
            
            <Heading style={{ fontSize: '20px' }}>Welcome to MoveAuditor!</Heading>
            <Text style={{ fontSize: '15px', color: '#3c3f44' }}>
              Hi {name || 'there'},
            </Text>
            <Text style={{ fontSize: '15px', color: '#3c3f44' }}>
              We're excited to have you on board. MoveAuditor uses advanced AI to help you secure your Sui smart contracts. 
              You can start by submitting a single file or a full GitHub repository for analysis.
            </Text>

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

export default WelcomeEmail;
