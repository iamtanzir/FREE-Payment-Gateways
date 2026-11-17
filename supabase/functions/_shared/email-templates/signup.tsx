/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,

  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}


export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email for {siteName}</Preview>
    <Body style={main}>
      <Container style={wrapper}>
        {/* Header */}
        <Section style={header}>
          <Text style={wordmark}>{siteName}</Text>
        </Section>

        {/* Content */}
        <Section style={content}>
          <Heading style={h1}>Welcome to {siteName}! 🎉</Heading>
          <Text style={text}>
            Thanks for signing up! You're just one step away from getting started with{' '}
            <Link href={siteUrl} style={link}>
              <strong>{siteName}</strong>
            </Link>
            .
          </Text>
          <Text style={text}>
            Please confirm your email address (
            <Link href={`mailto:${recipient}`} style={link}>
              {recipient}
            </Link>
            ) by clicking the button below:
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={confirmationUrl}>
              Verify Email Address
            </Button>
          </Section>

          <Text style={subtext}>
            Or copy and paste this URL into your browser:
          </Text>
          <Text style={urlText}>{confirmationUrl}</Text>
        </Section>

        {/* Divider */}
        <Hr style={divider} />

        {/* Footer */}
        <Section style={footerSection}>
          <Text style={footer}>
            If you didn't create an account with {siteName}, you can safely ignore this email.
          </Text>
          <Text style={copyright}>
            © {new Date().getFullYear()} {siteName}. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
const link = { color: '#6C3FC5', textDecoration: 'underline' }
const buttonContainer = { textAlign: 'center' as const, margin: '28px 0' }
const button = {
  backgroundColor: '#6C3FC5',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '8px',
  padding: '14px 32px',
  textDecoration: 'none',
  display: 'inline-block',
}
const subtext = {
  fontSize: '13px',
  color: '#999999',
  lineHeight: '1.5',
  margin: '0 0 8px',
  textAlign: 'center' as const,
}
const urlText = {
  fontSize: '12px',
  color: '#6C3FC5',
  lineHeight: '1.5',
  margin: '0 0 20px',
  wordBreak: 'break-all' as const,
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
