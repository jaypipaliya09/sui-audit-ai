import * as React from 'react';
import { Html, Head, Body, Container, Section, Text, Heading, Button, Link, Hr } from '@react-email/components';

interface AuditCompleteEmailProps {
  contractName: string;
  riskLevel: string;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  reportUrl: string;
  walrusUrl?: string;
  onChainUrl?: string;
  isRepo?: boolean;
  totalFindings?: number;
  contractsAudited?: number;
  isError?: boolean;
  errorMessage?: string;
}

export const AuditCompleteEmail = ({
  contractName,
  riskLevel,
  criticalCount,
  highCount,
  mediumCount,
  reportUrl,
  walrusUrl,
  onChainUrl,
  isRepo,
  totalFindings,
  contractsAudited,
  isError,
  errorMessage,
}: AuditCompleteEmailProps) => {
  const getRiskColor = (risk: string) => {
    switch (risk?.toUpperCase()) {
      case 'CRITICAL': return '#dc2626';
      case 'HIGH': return '#ea580c';
      case 'MEDIUM': return '#ca8a04';
      case 'LOW':
      case 'CLEAN': return '#16a34a';
      default: return '#666666';
    }
  };

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
            
            {isError ? (
              <>
                <Heading style={{ fontSize: '20px', color: '#dc2626' }}>Audit Failed: {contractName}</Heading>
                <Text style={{ fontSize: '15px', color: '#3c3f44' }}>
                  Unfortunately, the audit process failed with the following error:
                </Text>
                <Text style={{ fontSize: '14px', backgroundColor: '#fee2e2', padding: '12px', borderRadius: '4px', color: '#991b1b' }}>
                  {errorMessage}
                </Text>
              </>
            ) : (
              <>
                <Heading style={{ fontSize: '20px' }}>
                  {isRepo ? 'Repository' : 'Contract'} Audit Complete
                </Heading>
                <Text style={{ fontSize: '15px', color: '#3c3f44' }}>
                  Your audit for <strong>{contractName}</strong> has successfully completed.
                </Text>

                <Section style={{ backgroundColor: '#f9f9f9', padding: '16px', borderRadius: '8px', margin: '20px 0' }}>
                  <Text style={{ margin: '0 0 10px 0', fontSize: '16px' }}>
                    Overall Risk:{' '}
                    <span style={{ color: getRiskColor(riskLevel), fontWeight: 'bold' }}>
                      {riskLevel}
                    </span>
                  </Text>
                  
                  {isRepo ? (
                    <Text style={{ margin: '0', fontSize: '14px', color: '#666' }}>
                      Contracts Audited: {contractsAudited} | Total Findings: {totalFindings}
                    </Text>
                  ) : (
                    <Text style={{ margin: '0', fontSize: '14px', color: '#666' }}>
                      Critical: <span style={{ color: '#dc2626' }}>{criticalCount}</span> | 
                      High: <span style={{ color: '#ea580c' }}>{highCount}</span> | 
                      Medium: <span style={{ color: '#ca8a04' }}>{mediumCount}</span>
                    </Text>
                  )}
                </Section>

                <Section style={{ textAlign: 'center' as const, marginTop: '32px', marginBottom: '32px' }}>
                  <Button
                    href={reportUrl}
                    style={{ backgroundColor: '#6366f1', borderRadius: '5px', color: '#fff', fontSize: '16px', fontWeight: 'bold', textDecoration: 'none', textAlign: 'center' as const, padding: '12px 24px' }}
                  >
                    View Full Report
                  </Button>
                </Section>

                {walrusUrl && (
                  <Text style={{ fontSize: '14px', color: '#666' }}>
                    Permanent Walrus Record:{' '}
                    <Link href={walrusUrl} style={{ color: '#6366f1' }}>View on Explorer</Link>
                  </Text>
                )}
                {onChainUrl && (
                  <Text style={{ fontSize: '14px', color: '#666' }}>
                    On-Chain Verification:{' '}
                    <Link href={onChainUrl} style={{ color: '#6366f1' }}>View on Suiscan</Link>
                  </Text>
                )}
              </>
            )}

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

export default AuditCompleteEmail;
