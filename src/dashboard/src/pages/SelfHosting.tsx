import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Copy, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";

function CopyBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group">
      <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-xs sm:text-sm leading-relaxed">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 rounded-md border bg-background p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Copy code"
      >
        {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

const ENV_VARS = [
  { name: "VITE_SUPABASE_URL", desc: "আপনার Supabase প্রজেক্টের URL", example: "https://xxxxx.supabase.co" },
  { name: "VITE_SUPABASE_PUBLISHABLE_KEY", desc: "Supabase anon/public key", example: "eyJhbGciOiJI..." },
  { name: "VITE_SUPABASE_PROJECT_ID", desc: "Supabase project reference ID", example: "xxxxx" },
];

const sections = [
  {
    id: "benefits",
    title: "✨ সুবিধাসমূহ",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          FREE Payment Gateways সেলফ-হোস্ট করলে আপনি যেসব সুবিধা পাবেন:
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { icon: "🔐", title: "সম্পূর্ণ কন্ট্রোল", desc: "আপনার ডাটা, আপনার সার্ভার — কোনো থার্ড-পার্টি নির্ভরতা নেই" },
            { icon: "💰", title: "কোনো মাসিক ফি নেই", desc: "একবার লাইসেন্স কিনুন, আজীবন ব্যবহার করুন। হোস্টিং খরচ শুধু আপনার" },
            { icon: "🎨", title: "কাস্টমাইজেশন", desc: "সোর্স কোড এডিট করে আপনার ব্র্যান্ড অনুযায়ী পরিবর্তন করুন" },
            { icon: "🌍", title: "যেকোনো হোস্টিং", desc: "cPanel, VPS, Docker, Vercel, Netlify — যেখানে খুশি হোস্ট করুন" },
            { icon: "🔄", title: "ফ্রি আপডেট", desc: "লাইসেন্স মেয়াদে সকল আপডেট ও নতুন ফিচার বিনামূল্যে পাবেন" },
            { icon: "🛡️", title: "White Label", desc: "আপনার নিজের ব্র্যান্ড, লোগো, ও ডোমেইন ব্যবহার করুন" },
            { icon: "📱", title: "মাল্টি-ব্র্যান্ড সাপোর্ট", desc: "একটি ইনস্টলে একাধিক ব্র্যান্ড/ব্যবসা পরিচালনা করুন" },
            { icon: "⚡", title: "API অ্যাক্সেস", desc: "পূর্ণ REST API দিয়ে যেকোনো অ্যাপ/ওয়েবসাইটে ইন্টিগ্রেট করুন" },
          ].map((item) => (
            <div key={item.title} className="flex gap-3 rounded-lg border p-3">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <h4 className="text-sm font-semibold">{item.title}</h4>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <h4 className="text-sm font-semibold text-primary mb-2">📦 কি কি অন্তর্ভুক্ত?</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li>সম্পূর্ণ সোর্স কোড (Frontend + Edge Functions)</li>
            <li>ডাটাবেজ মাইগ্রেশন ফাইল (সব টেবিল ও RLS পলিসি)</li>
            <li>মাল্টি-গেটওয়ে সাপোর্ট (bKash, Nagad, Stripe, PayPal + ২০+ গেটওয়ে)</li>
            <li>PipraPay অ্যান্ড্রয়েড অ্যাপ ইন্টিগ্রেশন (MFS অটোমেশন)</li>
            <li>Invoice সিস্টেম, Payment Links, Checkout পেজ</li>
            <li>Webhook, Notification, Activity Logging</li>
            <li>ডকুমেন্টেশন ও সেটআপ গাইড</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "download",
    title: "📥 সোর্স কোড ডাউনলোড",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          লাইসেন্স কেনার পর আপনি সোর্স কোড ডাউনলোড করতে পারবেন:
        </p>
        <div className="space-y-3">
          <div className="rounded-lg border p-4 space-y-2">
            <h4 className="text-sm font-semibold">পদ্ধতি ১: GitHub থেকে Clone</h4>
            <p className="text-xs text-muted-foreground">লাইসেন্স অ্যাক্টিভ থাকলে GitHub private repo-তে অ্যাক্সেস পাবেন</p>
            <CopyBlock code={`git clone https://github.com/iamtanzir/FREE-Payment-Gateways.git
cd free-payment-gateways
npm install`} />
          </div>
          <div className="rounded-lg border p-4 space-y-2">
            <h4 className="text-sm font-semibold">পদ্ধতি ২: ZIP ডাউনলোড</h4>
            <p className="text-xs text-muted-foreground">
              GitHub repo পেজে গিয়ে <code className="rounded bg-muted px-1.5 py-0.5 text-xs">Code → Download ZIP</code> ক্লিক করুন। 
              ZIP এক্সট্র্যাক্ট করে <code className="rounded bg-muted px-1.5 py-0.5 text-xs">npm install</code> চালান।
            </p>
          </div>
          <div className="rounded-lg border p-4 space-y-2">
            <h4 className="text-sm font-semibold">পদ্ধতি ৩: রিলিজ পেজ</h4>
            <p className="text-xs text-muted-foreground">
              GitHub Releases পেজ থেকে সর্বশেষ স্ট্যাবল ভার্সন ডাউনলোড করুন। প্রতিটি রিলিজে চেঞ্জলগ ও মাইগ্রেশন নোট থাকে।
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4">
          <h4 className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-1">⚠️ গুরুত্বপূর্ণ</h4>
          <p className="text-xs text-muted-foreground">
            সোর্স কোড ব্যবহার করতে একটি বৈধ লাইসেন্স থাকা আবশ্যক। লাইসেন্স ছাড়া সফটওয়্যার ব্যবহার করা লাইসেন্স চুক্তির লঙ্ঘন।
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "prerequisites",
    title: "📋 প্রয়োজনীয়তা",
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">FREE Payment Gateways সেলফ-হোস্ট করতে আপনার যা লাগবে:</p>
        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
          <li>Node.js 18+ ও npm/bun</li>
          <li>Supabase প্রজেক্ট (ফ্রি টায়ারে যথেষ্ট)</li>
          <li>Supabase CLI (<code className="rounded bg-muted px-1.5 py-0.5 text-xs">npm i -g supabase</code>)</li>
          <li>যেকোনো হোস্টিং (cPanel, VPS, Vercel, Netlify, Docker)</li>
        </ul>
        <CopyBlock code={`# Clone the repository
git clone https://github.com/iamtanzir/FREE-Payment-Gateways.git
cd free-payment-gateways

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your Supabase credentials

# Build for production
npm run build`} />
      </div>
    ),
  },
  {
    id: "env",
    title: "🔑 Environment Variables",
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.env</code> ফাইলে নিচের ভ্যারিয়েবলগুলো সেট করুন:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-muted">
                <th className="text-left p-2 font-medium">Variable</th>
                <th className="text-left p-2 font-medium">Description</th>
                <th className="text-left p-2 font-medium">Example</th>
              </tr>
            </thead>
            <tbody>
              {ENV_VARS.map((v) => (
                <tr key={v.name} className="border-t">
                  <td className="p-2 font-mono text-xs text-primary">{v.name}</td>
                  <td className="p-2 text-muted-foreground">{v.desc}</td>
                  <td className="p-2 font-mono text-xs">{v.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">.env.example ফাইল</h4>
          <CopyBlock code={`VITE_SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key-here"
VITE_SUPABASE_PROJECT_ID="YOUR_PROJECT_REF"`} />
        </div>
      </div>
    ),
  },
  {
    id: "supabase",
    title: "🗄️ Supabase Backend Setup",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          FREE Payment Gateways-এর ব্যাকএন্ড Supabase-এ চলে। নিচের স্টেপগুলো ফলো করুন:
        </p>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Step 1: Supabase প্রজেক্ট তৈরি করুন</h4>
          <p className="text-sm text-muted-foreground">
            <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">supabase.com</a> এ গিয়ে একটি নতুন প্রজেক্ট তৈরি করুন। ফ্রি টায়ার যথেষ্ট।
          </p>
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Step 2: Supabase CLI ইনস্টল ও লিংক</h4>
          <CopyBlock code={`# Supabase CLI ইনস্টল করুন
npm install -g supabase

# Login করুন
supabase login

# প্রজেক্ট লিংক করুন (Settings > General থেকে project ref কপি করুন)
supabase link --project-ref YOUR_PROJECT_REF`} />
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Step 3: ডাটাবেজ মাইগ্রেশন চালান</h4>
          <CopyBlock code={`# সকল টেবিল ও RLS পলিসি সেটআপ করুন
supabase db push`} />
          <p className="text-sm text-muted-foreground">
            এটি <code className="rounded bg-muted px-1.5 py-0.5 text-xs">supabase/migrations/</code> ফোল্ডারের সকল SQL ফাইল আপনার Supabase প্রজেক্টে অ্যাপ্লাই করবে।
          </p>
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Step 4: Edge Functions ডিপ্লয়</h4>
          <CopyBlock code={`# সকল Edge Functions ডিপ্লয় করুন
supabase functions deploy create-payment
supabase functions deploy checkout-verify
supabase functions deploy verify-payment
supabase functions deploy refund-payment
supabase functions deploy webhook-delivery
supabase functions deploy webhook-sms
supabase functions deploy sync-exchange-rates
supabase functions deploy validate-device-otp
supabase functions deploy piprapay-webhook`} />
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Step 5: Edge Function Secrets সেট করুন</h4>
          <CopyBlock code={`# প্রয়োজনীয় secrets সেট করুন
supabase secrets set SUPABASE_URL=https://YOUR_REF.supabase.co
supabase secrets set SUPABASE_ANON_KEY=your-anon-key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key`} />
          <p className="text-sm text-muted-foreground">
            Service Role Key পেতে Supabase Dashboard → Settings → API → <code className="rounded bg-muted px-1.5 py-0.5 text-xs">service_role</code> key কপি করুন।
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "cpanel",
    title: "🖥️ cPanel (Shared Hosting)",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          cPanel বা যেকোনো shared hosting-এ FREE Payment Gateways হোস্ট করুন:
        </p>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Step 1: Build</h4>
          <CopyBlock code={`npm run build`} />
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Step 2: Upload</h4>
          <p className="text-sm text-muted-foreground">
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">dist/</code> ফোল্ডারের সব ফাইল cPanel File Manager দিয়ে 
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs"> public_html/</code> এ আপলোড করুন।
          </p>
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Step 3: .htaccess (SPA Fallback)</h4>
          <p className="text-sm text-muted-foreground">
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">public_html/.htaccess</code> ফাইল তৈরি করুন:
          </p>
          <CopyBlock language="apache" code={`<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>`} />
        </div>
      </div>
    ),
  },
  {
    id: "hostinger",
    title: "🌐 Hostinger",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Hostinger-এ হোস্ট করতে cPanel পদ্ধতি অনুসরণ করুন, অথবা SSH ব্যবহার করুন:
        </p>
        <CopyBlock code={`# SSH দিয়ে কানেক্ট করুন
ssh u123456789@your-server.hostinger.com

# Project clone ও build
cd public_html
git clone https://github.com/iamtanzir/FREE-Payment-Gateways.git .
npm install
npm run build

# Build output কে root-এ মুভ করুন
cp -r dist/* .

# .htaccess তৈরি করুন (cPanel সেকশনের মতো)`} />
        <p className="text-sm text-muted-foreground">
          অথবা Hostinger File Manager ব্যবহার করে লোকালি বিল্ড করা <code className="rounded bg-muted px-1.5 py-0.5 text-xs">dist/</code> ফোল্ডার আপলোড করুন।
        </p>
      </div>
    ),
  },
  {
    id: "vps",
    title: "🐧 VPS (Ubuntu + Nginx)",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Ubuntu VPS-এ Nginx দিয়ে প্রোডাকশন ডিপ্লয়:</p>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Step 1: Setup</h4>
          <CopyBlock code={`sudo apt update && sudo apt install -y nginx nodejs npm
git clone https://github.com/iamtanzir/FREE-Payment-Gateways.git /var/www/free-payment-gateways
cd /var/www/free-payment-gateways
npm install && npm run build`} />
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Step 2: Nginx Config</h4>
          <CopyBlock language="nginx" code={`server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/src/dashboard/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}`} />
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Step 3: SSL (Let's Encrypt)</h4>
          <CopyBlock code={`sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
sudo systemctl reload nginx`} />
        </div>
      </div>
    ),
  },
  {
    id: "docker",
    title: "🐳 Docker",
    content: (
      <div className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">nginx.conf</h4>
          <p className="text-sm text-muted-foreground">
            প্রজেক্ট রুটে <code className="rounded bg-muted px-1.5 py-0.5 text-xs">nginx.conf</code> ফাইল তৈরি করুন:
          </p>
          <CopyBlock language="nginx" code={`server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
}`} />
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Dockerfile</h4>
          <CopyBlock language="dockerfile" code={`# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`} />
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">docker-compose.yml</h4>
          <CopyBlock language="yaml" code={`version: '3.8'
services:
  free-payment-gateways:
    build:
      context: .
      args:
        VITE_SUPABASE_URL: \${VITE_SUPABASE_URL}
        VITE_SUPABASE_PUBLISHABLE_KEY: \${VITE_SUPABASE_PUBLISHABLE_KEY}
        VITE_SUPABASE_PROJECT_ID: \${VITE_SUPABASE_PROJECT_ID}
    ports:
      - "80:80"
    restart: unless-stopped`} />
        </div>
        <CopyBlock code={`# Build & Run
docker-compose up -d --build`} />
      </div>
    ),
  },
  {
    id: "vercel",
    title: "⚡ Vercel",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Vercel-এ one-click deploy:</p>
        <CopyBlock code={`# Vercel CLI install ও deploy
npm i -g vercel
vercel

# অথবা GitHub repo কানেক্ট করুন Vercel Dashboard থেকে`} />
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">vercel.json (SPA Rewrites)</h4>
          <CopyBlock language="json" code={`{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}`} />
        </div>
        <p className="text-sm text-muted-foreground">
          Vercel Dashboard → Settings → Environment Variables এ সকল <code className="rounded bg-muted px-1.5 py-0.5 text-xs">VITE_*</code> ভ্যারিয়েবল যোগ করুন।
        </p>
      </div>
    ),
  },
  {
    id: "netlify",
    title: "🌍 Netlify",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Netlify-তে deploy করতে:</p>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">_redirects ফাইল</h4>
          <p className="text-sm text-muted-foreground">
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">public/_redirects</code> ফাইল তৈরি করুন:
          </p>
          <CopyBlock code={`/*    /index.html   200`} />
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Netlify Settings</h4>
          <CopyBlock code={`Build command: npm run build
Publish directory: dist
Node version: 20`} />
        </div>
        <p className="text-sm text-muted-foreground">
          Netlify Dashboard → Site settings → Environment variables এ সকল <code className="rounded bg-muted px-1.5 py-0.5 text-xs">VITE_*</code> ভ্যারিয়েবল যোগ করুন।
        </p>
      </div>
    ),
  },
  {
    id: "update",
    title: "🔄 Update & Upgrade",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          নতুন ভার্সন রিলিজ হলে আপডেট করতে:
        </p>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Step 1: সোর্স কোড আপডেট</h4>
          <CopyBlock code={`cd free-payment-gateways
git pull origin main
npm install`} />
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Step 2: ডাটাবেজ মাইগ্রেশন</h4>
          <CopyBlock code={`# নতুন মাইগ্রেশন থাকলে অ্যাপ্লাই করুন
supabase db push`} />
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Step 3: রিবিল্ড ও রিডিপ্লয়</h4>
          <CopyBlock code={`# Frontend build
npm run build

# cPanel/Hostinger: dist/ ফোল্ডার আবার আপলোড করুন
# VPS: sudo systemctl reload nginx
# Docker: docker-compose up -d --build
# Vercel/Netlify: auto-deploy হবে git push-এ`} />
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Step 4: Edge Functions আপডেট</h4>
          <CopyBlock code={`# পরিবর্তিত functions রিডিপ্লয় করুন
supabase functions deploy --all`} />
        </div>
      </div>
    ),
  },
  {
    id: "troubleshooting",
    title: "❓ Troubleshooting / FAQ",
    content: (
      <div className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-destructive">🔴 ব্লাংক পেজ দেখাচ্ছে</h4>
          <p className="text-sm text-muted-foreground">
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.htaccess</code> (Apache) বা <code className="rounded bg-muted px-1.5 py-0.5 text-xs">try_files</code> (Nginx) ঠিকমতো কনফিগার হয়েছে কিনা চেক করুন। SPA ফলব্যাক ছাড়া রিফ্রেশে ব্লাংক পেজ আসবে।
          </p>
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-destructive">🔴 CORS Error</h4>
          <p className="text-sm text-muted-foreground">
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">VITE_SUPABASE_URL</code> সঠিক কিনা যাচাই করুন। Supabase Dashboard → Settings → API থেকে URL কপি করুন।
          </p>
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-destructive">🔴 404 on page refresh</h4>
          <p className="text-sm text-muted-foreground">
            এটি SPA routing সমস্যা। আপনার হোস্টিং প্ল্যাটফর্ম অনুযায়ী <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.htaccess</code>, <code className="rounded bg-muted px-1.5 py-0.5 text-xs">nginx.conf</code>, বা <code className="rounded bg-muted px-1.5 py-0.5 text-xs">vercel.json</code> কনফিগার করুন। উপরের সংশ্লিষ্ট সেকশন দেখুন।
          </p>
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-destructive">🔴 Edge Functions কাজ করছে না</h4>
          <p className="text-sm text-muted-foreground">
            1. <code className="rounded bg-muted px-1.5 py-0.5 text-xs">supabase functions deploy</code> চালিয়ে সব ফাংশন ডিপ্লয় হয়েছে কিনা নিশ্চিত করুন।<br />
            2. <code className="rounded bg-muted px-1.5 py-0.5 text-xs">supabase secrets list</code> দিয়ে সব সিক্রেট সেট হয়েছে কিনা যাচাই করুন।<br />
            3. <code className="rounded bg-muted px-1.5 py-0.5 text-xs">supabase functions serve</code> দিয়ে লোকালি টেস্ট করুন।
          </p>
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-destructive">🔴 Build fail হচ্ছে</h4>
          <p className="text-sm text-muted-foreground">
            Node.js ভার্সন 18+ আছে কিনা চেক করুন: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">node --version</code>। পুরোনো ভার্সনে TypeScript ফিচার সাপোর্ট নাও করতে পারে।
          </p>
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-destructive">🔴 লগইন/সাইনআপ কাজ করছে না</h4>
          <p className="text-sm text-muted-foreground">
            Supabase Dashboard → Authentication → URL Configuration এ আপনার সাইটের URL (<code className="rounded bg-muted px-1.5 py-0.5 text-xs">https://yourdomain.com</code>) যোগ করুন "Site URL" ও "Redirect URLs" এ।
          </p>
        </div>
      </div>
    ),
  },
];

export default function SelfHosting() {
  const [activeSection, setActiveSection] = useState("prerequisites");
  const tabsRef = useRef<HTMLDivElement>(null);

  const currentIndex = sections.findIndex((s) => s.id === activeSection);
  const progressPercent = ((currentIndex + 1) / sections.length) * 100;

  const goNext = () => {
    if (currentIndex < sections.length - 1) {
      setActiveSection(sections[currentIndex + 1].id);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setActiveSection(sections[currentIndex - 1].id);
    }
  };

  // Scroll active tab into view on mobile
  useEffect(() => {
    if (tabsRef.current) {
      const activeBtn = tabsRef.current.querySelector("[data-active='true']");
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [activeSection]);

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/landing" className="text-xl font-bold text-primary">
            FREE Payment Gateways
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/api-docs">API Docs</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/login">Login</Link>
            </Button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/landing">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </Link>
        </Button>

        <h1 className="text-2xl font-bold sm:text-3xl">🚀 Self-Hosting Guide</h1>
        <p className="mt-2 text-muted-foreground">
          FREE Payment Gateways আপনার নিজের সার্ভারে হোস্ট করুন — সম্পূর্ণ কন্ট্রোল আপনার হাতে
        </p>

        {/* Progress */}
        <div className="mt-6 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Step {currentIndex + 1} of {sections.length}</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
          {/* Mobile: horizontal scrollable tabs */}
          <div
            ref={tabsRef}
            className="flex gap-2 overflow-x-auto pb-2 lg:hidden scrollbar-none"
          >
            {sections.map((s) => (
              <button
                key={s.id}
                data-active={activeSection === s.id}
                onClick={() => setActiveSection(s.id)}
                className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeSection === s.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {s.title}
              </button>
            ))}
          </div>

          {/* Desktop: sidebar */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-20 space-y-1">
              {sections.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`block w-full text-left rounded-md px-3 py-2 text-sm transition-colors ${
                    activeSection === s.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <span className="mr-2 text-xs text-muted-foreground">{i + 1}.</span>
                  {s.title}
                </button>
              ))}
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">
            {sections.map((s) =>
              activeSection === s.id ? (
                <div key={s.id} className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">{s.title}</CardTitle>
                    </CardHeader>
                    <CardContent>{s.content}</CardContent>
                  </Card>

                  {/* Navigation buttons */}
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goPrev}
                      disabled={currentIndex === 0}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                    </Button>
                    {currentIndex < sections.length - 1 ? (
                      <Button size="sm" onClick={goNext}>
                        Next <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button size="sm" asChild>
                        <Link to="/login">🎉 শুরু করুন</Link>
                      </Button>
                    )}
                  </div>
                </div>
              ) : null
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
