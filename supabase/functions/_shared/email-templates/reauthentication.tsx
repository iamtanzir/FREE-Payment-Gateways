/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,

  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}


export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        <Section style={header}>
          <Text style={wordmark}>{siteName}</Text>
        </Section>

        <Section style={content}>
          <Heading style={h1}>Verification code 🔑</Heading>
          <Text style={text}>Use the code below to confirm your identity:</Text>

          <Section style={codeContainer}>
            <Text style={codeStyle}>{token}</Text>
          </Section>

          <Text style={subtext}>
            This code will expire shortly. Do not share it with anyone.
          </Text>
        </Section>

        <Hr style={divider} />

        <Section style={footerSection}>
          <Text style={footer}>
            If you didn't request this, you can safely ignore this email.
          </Text>
          <Text style={copyright}>
            © {new Date().getFullYear()} FREE Payment Gateways. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = {
  backgroundColor: '#f4f4f7',
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
  padding: '40px 0',
}
const wrapper = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  maxWidth: '560px',
  margin: '0 auto',
  overflow: 'hidden' as const,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
}
const header = {
  backgroundColor: '#6C3FC5',
  padding: '28px 40px',
  textAlign: 'center' as const,
}
const wordmark = { margin: '0 auto', textAlign: 'center' as const, fontSize: '24px', fontWeight: '700' as const, color: '#6C3FC5', letterSpacing: '0.5px' }
const content = { padding: '36px 40px 20px' }
const h1 = {
  fontSize: '24px',
  fontWeight: '700' as const,
  color: 'hsl(220, 20%, 10%)',
  margin: '0 0 16px',
  lineHeight: '1.3',
}
const text = {
  fontSize: '15px',
  color: 'hsl(220, 10%, 46%)',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const codeContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
  backgroundColor: '#f8f6fc',
  borderRadius: '8px',
  padding: '20px',
  border: '2px dashed #6C3FC5',
}
const codeStyle = {
  fontFamily: "'DM Sans', Courier, monospace",
  fontSize: '32px',
  fontWeight: '700' as const,
  color: '#6C3FC5',
  letterSpacing: '6px',
  margin: '0',
}
const subtext = {
  fontSize: '13px',
  color: '#999999',
  lineHeight: '1.5',
  margin: '0 0 8px',
  textAlign: 'center' as const,
}
const divider = { borderColor: '#eaeaea', margin: '0' }
const footerSection = { padding: '24px 40px' }
const footer = {
  fontSize: '13px',
  color: '#999999',
  lineHeight: '1.5',
  margin: '0 0 8px',
  textAlign: 'center' as const,
}
const copyright = {
  fontSize: '12px',
  color: '#cccccc',
  textAlign: 'center' as const,
  margin: '0',
}
