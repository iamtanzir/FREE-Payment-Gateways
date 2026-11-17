// Gateway brand colors and metadata — synced with PipraPay source modules

export interface GatewayBrand {
  color: string;
  bgColor: string;
  textColor: string;
  icon: string;
}

export interface GatewayLangText {
  en: string[];
  bn: string[];
}

export interface GatewayTemplateConfig {
  slug: string;
  title: string;
  currency: string;
  tab: "mfs" | "bank" | "global";
  gateway_type_hint: string;
  gateway_mode: string;
  colors: {
    primary_color: string;
    text_color: string;
    btn_color: string;
    btn_text_color: string;
  };
  fields: { name: string; label: string; type: string }[];
  lang_text?: GatewayLangText;
}

// ─── Complete gateway templates synced with PipraPay modules ───
export const GATEWAY_TEMPLATE_CONFIGS: GatewayTemplateConfig[] = [
  // ── MFS: bKash ──
  {
    slug: "bkash-personal", title: "Bkash Personal", currency: "BDT", tab: "mfs",
    gateway_type_hint: "bkash", gateway_mode: "personal",
    colors: { primary_color: "#D12053", text_color: "#FFFFFF", btn_color: "#D12053", btn_text_color: "#FFFFFF" },
    fields: [{ name: "qr_code", label: "QR Code", type: "image" }],
    lang_text: {
      en: ["Open bKash App or Dial *247#", "Choose 'Send Money'", "Now enter your bKash Mobile Menu PIN to confirm", "Done! You will receive a confirmation message from bKash"],
      bn: ["bKash অ্যাপ খুলুন অথবা *247# ডায়াল করুন", "'সেন্ড মানি' নির্বাচন করুন", "আপনার bKash পিন দিয়ে কনফার্ম করুন", "সম্পন্ন! আপনি bKash থেকে একটি কনফার্মেশন মেসেজ পাবেন"],
    },
  },
  {
    slug: "bkash-agent", title: "Bkash Agent", currency: "BDT", tab: "mfs",
    gateway_type_hint: "bkash", gateway_mode: "agent",
    colors: { primary_color: "#D12053", text_color: "#FFFFFF", btn_color: "#D12053", btn_text_color: "#FFFFFF" },
    fields: [{ name: "qr_code", label: "QR Code", type: "image" }],
    lang_text: {
      en: ["Open bKash App or Dial *247#", "Choose 'Send Money'", "Now enter your bKash Mobile Menu PIN to confirm", "Done! You will receive a confirmation message from bKash"],
      bn: ["bKash অ্যাপ খুলুন অথবা *247# ডায়াল করুন", "'সেন্ড মানি' নির্বাচন করুন", "আপনার bKash পিন দিয়ে কনফার্ম করুন", "সম্পন্ন! আপনি bKash থেকে একটি কনফার্মেশন মেসেজ পাবেন"],
    },
  },
  {
    slug: "bkash-merchant", title: "Bkash Merchant", currency: "BDT", tab: "mfs",
    gateway_type_hint: "bkash", gateway_mode: "merchant",
    colors: { primary_color: "#D12053", text_color: "#FFFFFF", btn_color: "#D12053", btn_text_color: "#FFFFFF" },
    fields: [{ name: "qr_code", label: "QR Code", type: "image" }],
    lang_text: {
      en: ["Open bKash App or Dial *247#", "Choose 'Payment'", "Now enter your bKash Mobile Menu PIN to confirm", "Done! You will receive a confirmation message from bKash"],
      bn: ["bKash অ্যাপ খুলুন অথবা *247# ডায়াল করুন", "'পেমেন্ট' নির্বাচন করুন", "আপনার bKash পিন দিয়ে কনফার্ম করুন", "সম্পন্ন! আপনি bKash থেকে একটি কনফার্মেশন মেসেজ পাবেন"],
    },
  },
  {
    slug: "bkash-api-tokenized", title: "Bkash Api (Tokenized)", currency: "BDT", tab: "mfs",
    gateway_type_hint: "bkash", gateway_mode: "live",
    colors: { primary_color: "#D12053", text_color: "#FFFFFF", btn_color: "#D12053", btn_text_color: "#FFFFFF" },
    fields: [
      { name: "username", label: "Username", type: "text" },
      { name: "password", label: "Password", type: "text" },
      { name: "app_key", label: "App Key", type: "text" },
      { name: "app_secret_key", label: "App Secret Key", type: "text" },
      { name: "mode", label: "Mode", type: "select" },
    ],
    lang_text: {
      en: ["You will be redirected to bKash payment page", "Login with your bKash account", "Confirm the payment", "You will be redirected back after payment"],
      bn: ["আপনাকে bKash পেমেন্ট পেজে রিডাইরেক্ট করা হবে", "আপনার bKash অ্যাকাউন্ট দিয়ে লগইন করুন", "পেমেন্ট কনফার্ম করুন", "পেমেন্টের পর আপনাকে ফেরত আনা হবে"],
    },
  },
  // ── MFS: Nagad ──
  {
    slug: "nagad-personal", title: "Nagad Personal", currency: "BDT", tab: "mfs",
    gateway_type_hint: "nagad", gateway_mode: "personal",
    colors: { primary_color: "#ed1c24", text_color: "#FFFFFF", btn_color: "#ed1c24", btn_text_color: "#FFFFFF" },
    fields: [],
    lang_text: {
      en: ["Open Nagad App or Dial *167#", "Choose 'Send Money'", "Now enter your Nagad Mobile Menu PIN to confirm", "Done! You will receive a confirmation message from bKash"],
      bn: ["নগদ অ্যাপ খুলুন অথবা *167# ডায়াল করুন", "'সেন্ড মানি' নির্বাচন করুন", "আপনার নগদ পিন দিয়ে কনফার্ম করুন", "সম্পন্ন! আপনি bKash থেকে একটি কনফার্মেশন মেসেজ পাবেন"],
    },
  },
  {
    slug: "nagad-agent", title: "Nagad Agent", currency: "BDT", tab: "mfs",
    gateway_type_hint: "nagad", gateway_mode: "agent",
    colors: { primary_color: "#ed1c24", text_color: "#FFFFFF", btn_color: "#ed1c24", btn_text_color: "#FFFFFF" },
    fields: [],
    lang_text: {
      en: ["Open Nagad App or Dial *167#", "Choose 'Send Money'", "Now enter your Nagad Mobile Menu PIN to confirm", "Done! You will receive a confirmation message"],
      bn: ["নগদ অ্যাপ খুলুন অথবা *167# ডায়াল করুন", "'সেন্ড মানি' নির্বাচন করুন", "আপনার নগদ পিন দিয়ে কনফার্ম করুন", "সম্পন্ন! আপনি একটি কনফার্মেশন মেসেজ পাবেন"],
    },
  },
  {
    slug: "nagad-merchant", title: "Nagad Merchant", currency: "BDT", tab: "mfs",
    gateway_type_hint: "nagad", gateway_mode: "merchant",
    colors: { primary_color: "#ed1c24", text_color: "#FFFFFF", btn_color: "#ed1c24", btn_text_color: "#FFFFFF" },
    fields: [{ name: "qr_code", label: "QR Code", type: "image" }],
    lang_text: {
      en: ["Open Nagad App or Dial *167#", "Choose 'Payment'", "Now enter your Nagad Mobile Menu PIN to confirm", "Done! You will receive a confirmation message"],
      bn: ["নগদ অ্যাপ খুলুন অথবা *167# ডায়াল করুন", "'পেমেন্ট' নির্বাচন করুন", "আপনার নগদ পিন দিয়ে কনফার্ম করুন", "সম্পন্ন! আপনি একটি কনফার্মেশন মেসেজ পাবেন"],
    },
  },
  {
    slug: "nagad-merchant-api", title: "Nagad Merchant Api", currency: "BDT", tab: "mfs",
    gateway_type_hint: "nagad", gateway_mode: "live",
    colors: { primary_color: "#ed1c24", text_color: "#FFFFFF", btn_color: "#ed1c24", btn_text_color: "#FFFFFF" },
    fields: [
      { name: "app_account", label: "App Account", type: "text" },
      { name: "merchant_id", label: "Merchant ID", type: "text" },
      { name: "private_key", label: "Private Key", type: "text" },
      { name: "public_key", label: "Public Key", type: "text" },
      { name: "mode", label: "Mode", type: "select" },
    ],
    lang_text: {
      en: ["You will be redirected to Nagad payment page", "Login with your Nagad account", "Confirm the payment", "You will be redirected back after payment"],
      bn: ["আপনাকে নগদ পেমেন্ট পেজে রিডাইরেক্ট করা হবে", "আপনার নগদ অ্যাকাউন্ট দিয়ে লগইন করুন", "পেমেন্ট কনফার্ম করুন", "পেমেন্টের পর আপনাকে ফেরত আনা হবে"],
    },
  },
  // ── MFS: Rocket ──
  {
    slug: "rocket-personal", title: "Rocket Personal", currency: "BDT", tab: "mfs",
    gateway_type_hint: "rocket", gateway_mode: "personal",
    colors: { primary_color: "#8C1D84", text_color: "#FFFFFF", btn_color: "#8C1D84", btn_text_color: "#FFFFFF" },
    fields: [{ name: "qr_code", label: "QR Code", type: "image" }],
    lang_text: {
      en: ["Open Rocket App or Dial *322#", "Choose 'Send Money'", "Now enter your Rocket Mobile Menu PIN to confirm", "Done! You will receive a confirmation message from Rocket"],
      bn: ["রকেট অ্যাপ খুলুন অথবা *322# ডায়াল করুন", "'সেন্ড মানি' নির্বাচন করুন", "আপনার রকেট পিন দিয়ে কনফার্ম করুন", "সম্পন্ন! আপনি একটি কনফার্মেশন মেসেজ পাবেন"],
    },
  },
  {
    slug: "rocket-agent", title: "Rocket Agent", currency: "BDT", tab: "mfs",
    gateway_type_hint: "rocket", gateway_mode: "agent",
    colors: { primary_color: "#8C1D84", text_color: "#FFFFFF", btn_color: "#8C1D84", btn_text_color: "#FFFFFF" },
    fields: [{ name: "qr_code", label: "QR Code", type: "image" }],
    lang_text: {
      en: ["Open Rocket App or Dial *322#", "Choose 'Send Money'", "Now enter your Rocket Mobile Menu PIN to confirm", "Done! You will receive a confirmation message from Rocket"],
      bn: ["রকেট অ্যাপ খুলুন অথবা *322# ডায়াল করুন", "'সেন্ড মানি' নির্বাচন করুন", "আপনার রকেট পিন দিয়ে কনফার্ম করুন", "সম্পন্ন! আপনি একটি কনফার্মেশন মেসেজ পাবেন"],
    },
  },
  {
    slug: "rocket-merchant", title: "Rocket Merchant", currency: "BDT", tab: "mfs",
    gateway_type_hint: "rocket", gateway_mode: "merchant",
    colors: { primary_color: "#8C1D84", text_color: "#FFFFFF", btn_color: "#8C1D84", btn_text_color: "#FFFFFF" },
    fields: [{ name: "qr_code", label: "QR Code", type: "image" }],
    lang_text: {
      en: ["Open Rocket App or Dial *322#", "Choose 'Payment'", "Now enter your Rocket Mobile Menu PIN to confirm", "Done! You will receive a confirmation message from Rocket"],
      bn: ["রকেট অ্যাপ খুলুন অথবা *322# ডায়াল করুন", "'পেমেন্ট' নির্বাচন করুন", "আপনার রকেট পিন দিয়ে কনফার্ম করুন", "সম্পন্ন! আপনি একটি কনফার্মেশন মেসেজ পাবেন"],
    },
  },
  // ── MFS: Upay ──
  {
    slug: "upay-personal", title: "Upay Personal", currency: "BDT", tab: "mfs",
    gateway_type_hint: "upay", gateway_mode: "personal",
    colors: { primary_color: "#ea2027", text_color: "#FFFFFF", btn_color: "#ea2027", btn_text_color: "#FFFFFF" },
    fields: [{ name: "qr_code", label: "QR Code", type: "image" }],
    lang_text: {
      en: ["Open Upay App", "Choose 'Send Money'", "Now enter your Upay PIN to confirm", "Done! You will receive a confirmation message"],
      bn: ["Upay অ্যাপ খুলুন", "'সেন্ড মানি' নির্বাচন করুন", "আপনার Upay পিন দিয়ে কনফার্ম করুন", "সম্পন্ন! আপনি একটি কনফার্মেশন মেসেজ পাবেন"],
    },
  },
  {
    slug: "upay-agent", title: "Upay Agent", currency: "BDT", tab: "mfs",
    gateway_type_hint: "upay", gateway_mode: "agent",
    colors: { primary_color: "#ea2027", text_color: "#FFFFFF", btn_color: "#ea2027", btn_text_color: "#FFFFFF" },
    fields: [{ name: "qr_code", label: "QR Code", type: "image" }],
    lang_text: {
      en: ["Open Upay App", "Choose 'Send Money'", "Now enter your Upay PIN to confirm", "Done! You will receive a confirmation message"],
      bn: ["Upay অ্যাপ খুলুন", "'সেন্ড মানি' নির্বাচন করুন", "আপনার Upay পিন দিয়ে কনফার্ম করুন", "সম্পন্ন! আপনি একটি কনফার্মেশন মেসেজ পাবেন"],
    },
  },
  {
    slug: "upay-merchant", title: "Upay Merchant", currency: "BDT", tab: "mfs",
    gateway_type_hint: "upay", gateway_mode: "merchant",
    colors: { primary_color: "#ea2027", text_color: "#FFFFFF", btn_color: "#ea2027", btn_text_color: "#FFFFFF" },
    fields: [{ name: "qr_code", label: "QR Code", type: "image" }],
    lang_text: {
      en: ["Open Upay App", "Choose 'Payment'", "Now enter your Upay PIN to confirm", "Done! You will receive a confirmation message"],
      bn: ["Upay অ্যাপ খুলুন", "'পেমেন্ট' নির্বাচন করুন", "আপনার Upay পিন দিয়ে কনফার্ম করুন", "সম্পন্ন! আপনি একটি কনফার্মেশন মেসেজ পাবেন"],
    },
  },
  // ── MFS: Cellfin ──
  {
    slug: "cellfin-personal", title: "Cellfin Personal", currency: "BDT", tab: "mfs",
    gateway_type_hint: "cellfin", gateway_mode: "personal",
    colors: { primary_color: "#00803d", text_color: "#FFFFFF", btn_color: "#00803d", btn_text_color: "#FFFFFF" },
    fields: [],
    lang_text: {
      en: ["Open Cellfin App", "Choose 'Send Money'", "Now enter your Cellfin PIN to confirm", "Done! You will receive a confirmation message"],
      bn: ["Cellfin অ্যাপ খুলুন", "'সেন্ড মানি' নির্বাচন করুন", "আপনার Cellfin পিন দিয়ে কনফার্ম করুন", "সম্পন্ন! আপনি একটি কনফার্মেশন মেসেজ পাবেন"],
    },
  },
  {
    slug: "cellfin-merchant", title: "Cellfin Merchant", currency: "BDT", tab: "mfs",
    gateway_type_hint: "cellfin", gateway_mode: "merchant",
    colors: { primary_color: "#00803d", text_color: "#FFFFFF", btn_color: "#00803d", btn_text_color: "#FFFFFF" },
    fields: [{ name: "qr_code", label: "QR Code", type: "image" }],
    lang_text: {
      en: ["Open Cellfin App", "Choose 'Payment'", "Now enter your Cellfin PIN to confirm", "Done! You will receive a confirmation message"],
      bn: ["Cellfin অ্যাপ খুলুন", "'পেমেন্ট' নির্বাচন করুন", "আপনার Cellfin পিন দিয়ে কনফার্ম করুন", "সম্পন্ন! আপনি একটি কনফার্মেশন মেসেজ পাবেন"],
    },
  },
  // ── MFS: mCash ──
  {
    slug: "mcash-personal", title: "mCash Personal", currency: "BDT", tab: "mfs",
    gateway_type_hint: "mcash", gateway_mode: "personal",
    colors: { primary_color: "#66b330", text_color: "#FFFFFF", btn_color: "#66b330", btn_text_color: "#FFFFFF" },
    fields: [{ name: "qr_code", label: "QR Code", type: "image" }],
    lang_text: {
      en: ["Open mCash App", "Choose 'Send Money'", "Now enter your mCash PIN to confirm", "Done! You will receive a confirmation message"],
      bn: ["mCash অ্যাপ খুলুন", "'সেন্ড মানি' নির্বাচন করুন", "আপনার mCash পিন দিয়ে কনফার্ম করুন", "সম্পন্ন! আপনি একটি কনফার্মেশন মেসেজ পাবেন"],
    },
  },
  {
    slug: "mcash-agent", title: "mCash Agent", currency: "BDT", tab: "mfs",
    gateway_type_hint: "mcash", gateway_mode: "agent",
    colors: { primary_color: "#66b330", text_color: "#FFFFFF", btn_color: "#66b330", btn_text_color: "#FFFFFF" },
    fields: [{ name: "qr_code", label: "QR Code", type: "image" }],
    lang_text: {
      en: ["Open mCash App", "Choose 'Send Money'", "Now enter your mCash PIN to confirm", "Done! You will receive a confirmation message"],
      bn: ["mCash অ্যাপ খুলুন", "'সেন্ড মানি' নির্বাচন করুন", "আপনার mCash পিন দিয়ে কনফার্ম করুন", "সম্পন্ন! আপনি একটি কনফার্মেশন মেসেজ পাবেন"],
    },
  },
  {
    slug: "mcash-merchant", title: "mCash Merchant", currency: "BDT", tab: "mfs",
    gateway_type_hint: "mcash", gateway_mode: "merchant",
    colors: { primary_color: "#66b330", text_color: "#FFFFFF", btn_color: "#66b330", btn_text_color: "#FFFFFF" },
    fields: [{ name: "qr_code", label: "QR Code", type: "image" }],
    lang_text: {
      en: ["Open mCash App", "Choose 'Payment'", "Now enter your mCash PIN to confirm", "Done! You will receive a confirmation message"],
      bn: ["mCash অ্যাপ খুলুন", "'পেমেন্ট' নির্বাচন করুন", "আপনার mCash পিন দিয়ে কনফার্ম করুন", "সম্পন্ন! আপনি একটি কনফার্মেশন মেসেজ পাবেন"],
    },
  },
  // ── MFS: Tap ──
  {
    slug: "tap-personal", title: "Tap Personal", currency: "BDT", tab: "mfs",
    gateway_type_hint: "tap", gateway_mode: "personal",
    colors: { primary_color: "#2962FF", text_color: "#FFFFFF", btn_color: "#2962FF", btn_text_color: "#FFFFFF" },
    fields: [{ name: "qr_code", label: "QR Code", type: "image" }],
    lang_text: {
      en: ["Open Tap App", "Choose 'Send Money'", "Now enter your Tap PIN to confirm", "Done! You will receive a confirmation message"],
      bn: ["Tap অ্যাপ খুলুন", "'সেন্ড মানি' নির্বাচন করুন", "আপনার Tap পিন দিয়ে কনফার্ম করুন", "সম্পন্ন! আপনি একটি কনফার্মেশন মেসেজ পাবেন"],
    },
  },
  {
    slug: "tap-agent", title: "Tap Agent", currency: "BDT", tab: "mfs",
    gateway_type_hint: "tap", gateway_mode: "agent",
    colors: { primary_color: "#2962FF", text_color: "#FFFFFF", btn_color: "#2962FF", btn_text_color: "#FFFFFF" },
    fields: [{ name: "qr_code", label: "QR Code", type: "image" }],
    lang_text: {
      en: ["Open Tap App", "Choose 'Send Money'", "Now enter your Tap PIN to confirm", "Done! You will receive a confirmation message"],
      bn: ["Tap অ্যাপ খুলুন", "'সেন্ড মানি' নির্বাচন করুন", "আপনার Tap পিন দিয়ে কনফার্ম করুন", "সম্পন্ন! আপনি একটি কনফার্মেশন মেসেজ পাবেন"],
    },
  },
  {
    slug: "tap-merchant", title: "Tap Merchant", currency: "BDT", tab: "mfs",
    gateway_type_hint: "tap", gateway_mode: "merchant",
    colors: { primary_color: "#2962FF", text_color: "#FFFFFF", btn_color: "#2962FF", btn_text_color: "#FFFFFF" },
    fields: [{ name: "qr_code", label: "QR Code", type: "image" }],
    lang_text: {
      en: ["Open Tap App", "Choose 'Payment'", "Now enter your Tap PIN to confirm", "Done! You will receive a confirmation message"],
      bn: ["Tap অ্যাপ খুলুন", "'পেমেন্ট' নির্বাচন করুন", "আপনার Tap পিন দিয়ে কনফার্ম করুন", "সম্পন্ন! আপনি একটি কনফার্মেশন মেসেজ পাবেন"],
    },
  },
  // ── MFS: iPay ──
  {
    slug: "ipay-personal", title: "iPay Personal", currency: "BDT", tab: "mfs",
    gateway_type_hint: "ipay", gateway_mode: "personal",
    colors: { primary_color: "#019789", text_color: "#FFFFFF", btn_color: "#019789", btn_text_color: "#FFFFFF" },
    fields: [],
    lang_text: {
      en: ["Open iPay App", "Choose 'Send Money'", "Now enter your iPay PIN to confirm", "Done! You will receive a confirmation message"],
      bn: ["iPay অ্যাপ খুলুন", "'সেন্ড মানি' নির্বাচন করুন", "আপনার iPay পিন দিয়ে কনফার্ম করুন", "সম্পন্ন! আপনি একটি কনফার্মেশন মেসেজ পাবেন"],
    },
  },
  {
    slug: "ipay-merchant", title: "iPay Merchant", currency: "BDT", tab: "mfs",
    gateway_type_hint: "ipay", gateway_mode: "merchant",
    colors: { primary_color: "#019789", text_color: "#FFFFFF", btn_color: "#019789", btn_text_color: "#FFFFFF" },
    fields: [],
    lang_text: {
      en: ["Open iPay App", "Choose 'Payment'", "Now enter your iPay PIN to confirm", "Done! You will receive a confirmation message"],
      bn: ["iPay অ্যাপ খুলুন", "'পেমেন্ট' নির্বাচন করুন", "আপনার iPay পিন দিয়ে কনফার্ম করুন", "সম্পন্ন! আপনি একটি কনফার্মেশন মেসেজ পাবেন"],
    },
  },
  // ── MFS: OkWallet ──
  {
    slug: "okwallet-personal", title: "OkWallet Personal", currency: "BDT", tab: "mfs",
    gateway_type_hint: "okwallet", gateway_mode: "personal",
    colors: { primary_color: "#ffde2d", text_color: "#000000", btn_color: "#ffde2d", btn_text_color: "#000000" },
    fields: [{ name: "qr_code", label: "QR Code", type: "image" }],
    lang_text: {
      en: ["Open OK Wallet App", "Choose 'Send Money'", "Now enter your OK Wallet PIN to confirm", "Done! You will receive a confirmation message"],
      bn: ["OK Wallet অ্যাপ খুলুন", "'সেন্ড মানি' নির্বাচন করুন", "আপনার OK Wallet পিন দিয়ে কনফার্ম করুন", "সম্পন্ন! আপনি একটি কনফার্মেশন মেসেজ পাবেন"],
    },
  },
  {
    slug: "okwallet-agent", title: "OkWallet Agent", currency: "BDT", tab: "mfs",
    gateway_type_hint: "okwallet", gateway_mode: "agent",
    colors: { primary_color: "#ffde2d", text_color: "#000000", btn_color: "#ffde2d", btn_text_color: "#000000" },
    fields: [{ name: "qr_code", label: "QR Code", type: "image" }],
    lang_text: {
      en: ["Open OK Wallet App", "Choose 'Send Money'", "Now enter your OK Wallet PIN to confirm", "Done! You will receive a confirmation message"],
      bn: ["OK Wallet অ্যাপ খুলুন", "'সেন্ড মানি' নির্বাচন করুন", "আপনার OK Wallet পিন দিয়ে কনফার্ম করুন", "সম্পন্ন! আপনি একটি কনফার্মেশন মেসেজ পাবেন"],
    },
  },
  {
    slug: "okwallet-merchant", title: "OkWallet Merchant", currency: "BDT", tab: "mfs",
    gateway_type_hint: "okwallet", gateway_mode: "merchant",
    colors: { primary_color: "#ffde2d", text_color: "#000000", btn_color: "#ffde2d", btn_text_color: "#000000" },
    fields: [{ name: "qr_code", label: "QR Code", type: "image" }],
    lang_text: {
      en: ["Open OK Wallet App", "Choose 'Payment'", "Now enter your OK Wallet PIN to confirm", "Done! You will receive a confirmation message"],
      bn: ["OK Wallet অ্যাপ খুলুন", "'পেমেন্ট' নির্বাচন করুন", "আপনার OK Wallet পিন দিয়ে কনফার্ম করুন", "সম্পন্ন! আপনি একটি কনফার্মেশন মেসেজ পাবেন"],
    },
  },
  // ── MFS: PathaoPay ──
  {
    slug: "pathaopay-personal", title: "PathaoPay Personal", currency: "BDT", tab: "mfs",
    gateway_type_hint: "pathaopay", gateway_mode: "personal",
    colors: { primary_color: "#3b82de", text_color: "#FFFFFF", btn_color: "#3b82de", btn_text_color: "#FFFFFF" },
    fields: [{ name: "qr_code", label: "QR Code", type: "image" }],
    lang_text: {
      en: ["Open PathaoPay App", "Choose 'Send Money'", "Now enter your PathaoPay PIN to confirm", "Done! You will receive a confirmation message"],
      bn: ["PathaoPay অ্যাপ খুলুন", "'সেন্ড মানি' নির্বাচন করুন", "আপনার PathaoPay পিন দিয়ে কনফার্ম করুন", "সম্পন্ন! আপনি একটি কনফার্মেশন মেসেজ পাবেন"],
    },
  },
  {
    slug: "pathaopay-merchant", title: "PathaoPay Merchant", currency: "BDT", tab: "mfs",
    gateway_type_hint: "pathaopay", gateway_mode: "merchant",
    colors: { primary_color: "#3b82de", text_color: "#FFFFFF", btn_color: "#3b82de", btn_text_color: "#FFFFFF" },
    fields: [{ name: "qr_code", label: "QR Code", type: "image" }],
    lang_text: {
      en: ["Open PathaoPay App", "Choose 'Payment'", "Now enter your PathaoPay PIN to confirm", "Done! You will receive a confirmation message"],
      bn: ["PathaoPay অ্যাপ খুলুন", "'পেমেন্ট' নির্বাচন করুন", "আপনার PathaoPay পিন দিয়ে কনফার্ম করুন", "সম্পন্ন! আপনি একটি কনফার্মেশন মেসেজ পাবেন"],
    },
  },
  {
    slug: "pathaopay-merchant-api", title: "PathaoPay Merchant Api", currency: "BDT", tab: "mfs",
    gateway_type_hint: "pathaopay", gateway_mode: "live",
    colors: { primary_color: "#3b82de", text_color: "#FFFFFF", btn_color: "#3b82de", btn_text_color: "#FFFFFF" },
    fields: [
      { name: "api_key", label: "API Key", type: "text" },
      { name: "secret_key", label: "Secret Key", type: "text" },
      { name: "mode", label: "Mode", type: "select" },
    ],
    lang_text: {
      en: ["You will be redirected to PathaoPay payment page", "Login with your PathaoPay account", "Confirm the payment", "You will be redirected back after payment"],
      bn: ["আপনাকে PathaoPay পেমেন্ট পেজে রিডাইরেক্ট করা হবে", "আপনার PathaoPay অ্যাকাউন্ট দিয়ে লগইন করুন", "পেমেন্ট কনফার্ম করুন", "পেমেন্টের পর আপনাকে ফেরত আনা হবে"],
    },
  },
  // ── MFS: Telecash ──
  {
    slug: "telecash-personal", title: "Telecash Personal", currency: "BDT", tab: "mfs",
    gateway_type_hint: "telecash", gateway_mode: "personal",
    colors: { primary_color: "#ed1495", text_color: "#FFFFFF", btn_color: "#ed1495", btn_text_color: "#FFFFFF" },
    fields: [{ name: "qr_code", label: "QR Code", type: "image" }],
    lang_text: {
      en: ["Open Telecash App", "Choose 'Send Money'", "Now enter your Telecash PIN to confirm", "Done! You will receive a confirmation message"],
      bn: ["Telecash অ্যাপ খুলুন", "'সেন্ড মানি' নির্বাচন করুন", "আপনার Telecash পিন দিয়ে কনফার্ম করুন", "সম্পন্ন! আপনি একটি কনফার্মেশন মেসেজ পাবেন"],
    },
  },
  {
    slug: "telecash-agent", title: "Telecash Agent", currency: "BDT", tab: "mfs",
    gateway_type_hint: "telecash", gateway_mode: "agent",
    colors: { primary_color: "#ed1495", text_color: "#FFFFFF", btn_color: "#ed1495", btn_text_color: "#FFFFFF" },
    fields: [{ name: "qr_code", label: "QR Code", type: "image" }],
    lang_text: {
      en: ["Open Telecash App", "Choose 'Send Money'", "Now enter your Telecash PIN to confirm", "Done! You will receive a confirmation message"],
      bn: ["Telecash অ্যাপ খুলুন", "'সেন্ড মানি' নির্বাচন করুন", "আপনার Telecash পিন দিয়ে কনফার্ম করুন", "সম্পন্ন! আপনি একটি কনফার্মেশন মেসেজ পাবেন"],
    },
  },
  {
    slug: "telecash-merchant", title: "Telecash Merchant", currency: "BDT", tab: "mfs",
    gateway_type_hint: "telecash", gateway_mode: "merchant",
    colors: { primary_color: "#ed1495", text_color: "#FFFFFF", btn_color: "#ed1495", btn_text_color: "#FFFFFF" },
    fields: [{ name: "qr_code", label: "QR Code", type: "image" }],
    lang_text: {
      en: ["Open Telecash App", "Choose 'Payment'", "Now enter your Telecash PIN to confirm", "Done! You will receive a confirmation message"],
      bn: ["Telecash অ্যাপ খুলুন", "'পেমেন্ট' নির্বাচন করুন", "আপনার Telecash পিন দিয়ে কনফার্ম করুন", "সম্পন্ন! আপনি একটি কনফার্মেশন মেসেজ পাবেন"],
    },
  },
  // ── MFS: API Gateways (tab corrected to mfs per PipraPay) ──
  {
    slug: "aamarpay", title: "aamarPay Gateway", currency: "BDT", tab: "mfs",
    gateway_type_hint: "aamarpay", gateway_mode: "live",
    colors: { primary_color: "#f39700", text_color: "#504e52", btn_color: "#f39700", btn_text_color: "#504e52" },
    fields: [
      { name: "store_id", label: "Store ID", type: "text" },
      { name: "signature_key", label: "Signature Key", type: "text" },
      { name: "mode", label: "Mode", type: "select" },
    ],
    lang_text: {
      en: ["You will be redirected to aamarPay payment page", "Choose your preferred payment method", "Complete the payment", "You will be redirected back automatically"],
      bn: ["আপনাকে aamarPay পেমেন্ট পেজে রিডাইরেক্ট করা হবে", "আপনার পছন্দের পেমেন্ট মেথড বেছে নিন", "পেমেন্ট সম্পন্ন করুন", "আপনাকে স্বয়ংক্রিয়ভাবে ফেরত আনা হবে"],
    },
  },
  {
    slug: "sslcommerz", title: "SSLCommerz Gateway", currency: "BDT", tab: "mfs",
    gateway_type_hint: "sslcommerz", gateway_mode: "live",
    colors: { primary_color: "#295cab", text_color: "#FFFFFF", btn_color: "#295cab", btn_text_color: "#FFFFFF" },
    fields: [
      { name: "store_id", label: "Store ID", type: "text" },
      { name: "store_password", label: "Store Password", type: "text" },
      { name: "product_category", label: "Product Category", type: "text" },
      { name: "mode", label: "Mode", type: "select" },
    ],
    lang_text: {
      en: ["You will be redirected to SSLCommerz payment page", "Choose your preferred payment method", "Complete the payment", "You will be redirected back automatically"],
      bn: ["আপনাকে SSLCommerz পেমেন্ট পেজে রিডাইরেক্ট করা হবে", "আপনার পছন্দের পেমেন্ট মেথড বেছে নিন", "পেমেন্ট সম্পন্ন করুন", "আপনাকে স্বয়ংক্রিয়ভাবে ফেরত আনা হবে"],
    },
  },
  {
    slug: "shurjopay", title: "ShurjoPay Gateway", currency: "BDT", tab: "mfs",
    gateway_type_hint: "shurjopay", gateway_mode: "live",
    colors: { primary_color: "#229454", text_color: "#FFFFFF", btn_color: "#229454", btn_text_color: "#FFFFFF" },
    fields: [
      { name: "username", label: "Username", type: "text" },
      { name: "password", label: "Password", type: "text" },
      { name: "prefix", label: "Prefix", type: "text" },
      { name: "mode", label: "Mode", type: "select" },
    ],
    lang_text: {
      en: ["You will be redirected to ShurjoPay payment page", "Choose your preferred payment method", "Complete the payment", "You will be redirected back automatically"],
      bn: ["আপনাকে ShurjoPay পেমেন্ট পেজে রিডাইরেক্ট করা হবে", "আপনার পছন্দের পেমেন্ট মেথড বেছে নিন", "পেমেন্ট সম্পন্ন করুন", "আপনাকে স্বয়ংক্রিয়ভাবে ফেরত আনা হবে"],
    },
  },
  {
    slug: "eps", title: "EPS Gateway", currency: "BDT", tab: "mfs",
    gateway_type_hint: "eps_gateway", gateway_mode: "live",
    colors: { primary_color: "#ee2d42", text_color: "#FFFFFF", btn_color: "#ee2d42", btn_text_color: "#FFFFFF" },
    fields: [
      { name: "merchant_id", label: "Merchant ID", type: "text" },
      { name: "store_id", label: "Store ID", type: "text" },
      { name: "username", label: "Username", type: "text" },
      { name: "password", label: "Password", type: "text" },
      { name: "hashkey", label: "Hash Key", type: "text" },
      { name: "mode", label: "Mode", type: "select" },
    ],
    lang_text: {
      en: ["You will be redirected to EPS payment page", "Choose your preferred payment method", "Complete the payment", "You will be redirected back automatically"],
      bn: ["আপনাকে EPS পেমেন্ট পেজে রিডাইরেক্ট করা হবে", "আপনার পছন্দের পেমেন্ট মেথড বেছে নিন", "পেমেন্ট সম্পন্ন করুন", "আপনাকে স্বয়ংক্রিয়ভাবে ফেরত আনা হবে"],
    },
  },
  {
    slug: "paystation", title: "PayStation Gateway", currency: "BDT", tab: "mfs",
    gateway_type_hint: "paystation", gateway_mode: "live",
    colors: { primary_color: "#351e53", text_color: "#FFFFFF", btn_color: "#351e53", btn_text_color: "#FFFFFF" },
    fields: [
      { name: "merchant_id", label: "Merchant ID", type: "text" },
      { name: "merchant_password", label: "Merchant Password", type: "text" },
      { name: "checkout_items", label: "Checkout Items", type: "text" },
      { name: "pay_with_charge", label: "Pay With Charge", type: "select" },
      { name: "mode", label: "Mode", type: "select" },
    ],
    lang_text: {
      en: ["You will be redirected to PayStation payment page", "Choose your preferred payment method", "Complete the payment", "You will be redirected back automatically"],
      bn: ["আপনাকে PayStation পেমেন্ট পেজে রিডাইরেক্ট করা হবে", "আপনার পছন্দের পেমেন্ট মেথড বেছে নিন", "পেমেন্ট সম্পন্ন করুন", "আপনাকে স্বয়ংক্রিয়ভাবে ফেরত আনা হবে"],
    },
  },
  // ── Global: Stripe ──
  {
    slug: "stripe", title: "Stripe Gateway", currency: "USD", tab: "global",
    gateway_type_hint: "stripe", gateway_mode: "live",
    colors: { primary_color: "#635BFF", text_color: "#FFFFFF", btn_color: "#635BFF", btn_text_color: "#FFFFFF" },
    fields: [
      { name: "secret_key", label: "Secret Key", type: "text" },
      { name: "webhook_secret", label: "Webhook Secret", type: "text" },
      { name: "mode", label: "Mode", type: "select" },
    ],
    lang_text: {
      en: ["You will be redirected to Stripe payment page", "Enter your card details", "Complete the payment", "You will be redirected back automatically"],
      bn: ["আপনাকে Stripe পেমেন্ট পেজে রিডাইরেক্ট করা হবে", "আপনার কার্ডের তথ্য দিন", "পেমেন্ট সম্পন্ন করুন", "আপনাকে স্বয়ংক্রিয়ভাবে ফেরত আনা হবে"],
    },
  },
  // ── Global: Manual ──
  {
    slug: "paypal-manual", title: "PayPal Manual", currency: "USD", tab: "global",
    gateway_type_hint: "paypal", gateway_mode: "manual",
    colors: { primary_color: "#003087", text_color: "#FFFFFF", btn_color: "#003087", btn_text_color: "#FFFFFF" },
    fields: [{ name: "recipient_paypal_email", label: "Recipient PayPal Email", type: "text" }],
    lang_text: {
      en: ["Open PayPal App or website", "Choose 'Send Money'", "Enter the recipient email", "Complete the payment", "Note the Transaction ID"],
      bn: ["PayPal অ্যাপ বা ওয়েবসাইট খুলুন", "'সেন্ড মানি' নির্বাচন করুন", "প্রাপকের ইমেইল লিখুন", "পেমেন্ট সম্পন্ন করুন", "ট্রানজ্যাকশন আইডি নোট করুন"],
    },
  },
  // ── Global: Crypto ──
  {
    slug: "binance-personal", title: "Binance Personal", currency: "USD", tab: "global",
    gateway_type_hint: "binance", gateway_mode: "personal",
    colors: { primary_color: "#f0b90b", text_color: "#000000", btn_color: "#f0b90b", btn_text_color: "#000000" },
    fields: [
      { name: "binance_uid", label: "Binance UID", type: "text" },
      { name: "api_key", label: "API Key", type: "text" },
      { name: "secret_key", label: "Secret Key", type: "text" },
      { name: "qr_code", label: "QR Code", type: "image" },
    ],
    lang_text: {
      en: ["Open Binance App", "Choose 'Send' or 'Pay'", "Enter the Binance UID / Pay ID", "Confirm the payment", "Note the Transaction ID"],
      bn: ["Binance অ্যাপ খুলুন", "'Send' বা 'Pay' নির্বাচন করুন", "Binance UID / Pay ID লিখুন", "পরিমাণ লিখুন", "পেমেন্ট কনফার্ম করুন", "ট্রানজ্যাকশন আইডি নোট করুন"],
    },
  },
  {
    slug: "oxapay", title: "OxaPay Gateway", currency: "USD", tab: "global",
    gateway_type_hint: "oxapay", gateway_mode: "live",
    colors: { primary_color: "#1a34c2", text_color: "#FFFFFF", btn_color: "#1a34c2", btn_text_color: "#FFFFFF" },
    fields: [
      { name: "api_key", label: "API Key", type: "text" },
      { name: "fee_paid_by_payer", label: "Fee Paid by Payer", type: "select" },
      { name: "under_paid_coverage", label: "Under Paid Coverage", type: "text" },
      { name: "mixed_payment", label: "Mixed Payment", type: "select" },
      { name: "mode", label: "Mode", type: "select" },
    ],
    lang_text: {
      en: ["You will be redirected to OxaPay payment page", "Choose your preferred cryptocurrency", "Send the exact amount", "Wait for blockchain confirmation", "You will be redirected back automatically"],
      bn: ["আপনাকে OxaPay পেমেন্ট পেজে রিডাইরেক্ট করা হবে", "আপনার পছন্দের ক্রিপ্টোকারেন্সি বেছে নিন", "সঠিক পরিমাণ পাঠান", "ব্লকচেইন কনফার্মেশনের জন্য অপেক্ষা করুন", "আপনাকে স্বয়ংক্রিয়ভাবে ফেরত আনা হবে"],
    },
  },
  // ── Global: Manual ──
  {
    slug: "payeer-manual", title: "Payeer Manual", currency: "USD", tab: "global",
    gateway_type_hint: "payeer", gateway_mode: "manual",
    colors: { primary_color: "#64b3df", text_color: "#FFFFFF", btn_color: "#64b3df", btn_text_color: "#FFFFFF" },
    fields: [{ name: "recipient_payeer_account", label: "Recipient Payeer Account", type: "text" }],
    lang_text: {
      en: ["Open Payeer App or website", "Choose 'Transfer'", "Enter the Payeer Account ID", "Complete the transfer", "Note the Transaction ID"],
      bn: ["Payeer অ্যাপ বা ওয়েবসাইট খুলুন", "'ট্রান্সফার' নির্বাচন করুন", "Payeer অ্যাকাউন্ট আইডি লিখুন", "পরিমাণ লিখুন", "ট্রান্সফার সম্পন্ন করুন", "ট্রানজ্যাকশন আইডি নোট করুন"],
    },
  },
  {
    slug: "payoneer-manual", title: "Payoneer Manual", currency: "USD", tab: "global",
    gateway_type_hint: "payoneer", gateway_mode: "manual",
    colors: { primary_color: "#252526", text_color: "#FFFFFF", btn_color: "#252526", btn_text_color: "#FFFFFF" },
    fields: [{ name: "recipient_payoneer_email", label: "Recipient Payoneer Email", type: "text" }],
    lang_text: {
      en: ["Login to Payoneer", "Choose 'Make a Payment'", "Enter the recipient email", "Complete the payment", "Note the Transaction ID"],
      bn: ["Payoneer-এ লগইন করুন", "'Make a Payment' নির্বাচন করুন", "প্রাপকের ইমেইল লিখুন", "পরিমাণ লিখুন", "পেমেন্ট সম্পন্ন করুন", "ট্রানজ্যাকশন আইডি নোট করুন"],
    },
  },
  {
    slug: "wise-manual", title: "Wise Manual", currency: "USD", tab: "global",
    gateway_type_hint: "wise", gateway_mode: "manual",
    colors: { primary_color: "#9fe870", text_color: "#000000", btn_color: "#9fe870", btn_text_color: "#000000" },
    fields: [{ name: "recipient_wise_email", label: "Recipient Wise Email", type: "text" }],
    lang_text: {
      en: ["Login to Wise (TransferWise)", "Choose 'Send Money'", "Enter the recipient email", "Complete the transfer", "Note the Transfer ID"],
      bn: ["Wise (TransferWise)-এ লগইন করুন", "'Send Money' নির্বাচন করুন", "প্রাপকের ইমেইল লিখুন", "পরিমাণ লিখুন", "ট্রান্সফার সম্পন্ন করুন", "ট্রান্সফার আইডি নোট করুন"],
    },
  },
  {
    slug: "taptap-send-manual", title: "TapTap Send Manual", currency: "USD", tab: "global",
    gateway_type_hint: "taptapsend", gateway_mode: "manual",
    colors: { primary_color: "#6c3baa", text_color: "#FFFFFF", btn_color: "#6c3baa", btn_text_color: "#FFFFFF" },
    fields: [{ name: "recipient_phone_number", label: "Recipient Phone Number", type: "text" }],
    lang_text: {
      en: ["Open TapTap Send App", "Choose the destination country", "Enter the recipient phone number", "Complete the transfer", "Note the Reference Number"],
      bn: ["TapTap Send অ্যাপ খুলুন", "গন্তব্য দেশ নির্বাচন করুন", "প্রাপকের ফোন নম্বর লিখুন", "পরিমাণ লিখুন", "ট্রান্সফার সম্পন্ন করুন", "রেফারেন্স নম্বর নোট করুন"],
    },
  },
  // ── Bank ──
  {
    slug: "bank-transfer", title: "Bank Transfer", currency: "BDT", tab: "bank",
    gateway_type_hint: "bank_transfer", gateway_mode: "manual",
    colors: { primary_color: "#059669", text_color: "#FFFFFF", btn_color: "#059669", btn_text_color: "#FFFFFF" },
    fields: [
      { name: "bank_name", label: "Bank Name", type: "text" },
      { name: "account_holder_name", label: "Account Holder Name", type: "text" },
      { name: "account_number", label: "Account Number", type: "text" },
      { name: "branch_name", label: "Branch Name", type: "text" },
      { name: "routing_number", label: "Routing Number", type: "text" },
      { name: "swift_code", label: "Swift Code", type: "text" },
    ],
    lang_text: {
      en: ["Login to your bank app or iBanking", "Choose 'Fund Transfer'", "Enter the account details", "Complete the transfer", "Note the reference number"],
      bn: ["আপনার ব্যাংক অ্যাপ বা iBanking-এ লগইন করুন", "'ফান্ড ট্রান্সফার' নির্বাচন করুন", "অ্যাকাউন্টের তথ্য দিন", "ট্রান্সফার সম্পন্ন করুন", "রেফারেন্স নম্বর নোট করুন"],
    },
  },
  {
    slug: "bank-transfer-intl", title: "Bank Transfer (International)", currency: "USD", tab: "bank",
    gateway_type_hint: "bank_transfer", gateway_mode: "manual",
    colors: { primary_color: "#059669", text_color: "#FFFFFF", btn_color: "#059669", btn_text_color: "#FFFFFF" },
    fields: [
      { name: "bank_name", label: "Bank Name", type: "text" },
      { name: "account_holder_name", label: "Account Holder Name", type: "text" },
      { name: "account_number", label: "Account Number", type: "text" },
      { name: "branch_name", label: "Branch Name", type: "text" },
      { name: "routing_number", label: "Routing Number", type: "text" },
      { name: "swift_code", label: "Swift Code", type: "text" },
    ],
    lang_text: {
      en: ["Login to your bank app or iBanking", "Choose 'International Transfer'", "Enter the account details", "Complete the transfer", "Note the reference number"],
      bn: ["আপনার ব্যাংক অ্যাপ বা iBanking-এ লগইন করুন", "'ইন্টারন্যাশনাল ট্রান্সফার' নির্বাচন করুন", "অ্যাকাউন্টের তথ্য দিন", "পরিমাণ লিখুন", "ট্রান্সফার সম্পন্ন করুন", "রেফারেন্স নম্বর নোট করুন"],
    },
  },
];

// Brand colors for known gateway types
const GATEWAY_BRAND_MAP: Record<string, GatewayBrand> = {
  bkash: { color: "#D12053", bgColor: "#D1205315", textColor: "#D12053", icon: "𝗯" },
  nagad: { color: "#ed1c24", bgColor: "#ed1c2415", textColor: "#ed1c24", icon: "𝗡" },
  rocket: { color: "#8C1D84", bgColor: "#8C1D8415", textColor: "#8C1D84", icon: "🚀" },
  upay: { color: "#ea2027", bgColor: "#ea202715", textColor: "#ea2027", icon: "𝗨" },
  mcash: { color: "#66b330", bgColor: "#66b33015", textColor: "#66b330", icon: "𝗠" },
  tap: { color: "#2962FF", bgColor: "#2962FF15", textColor: "#2962FF", icon: "𝗧" },
  ipay: { color: "#019789", bgColor: "#01978915", textColor: "#019789", icon: "𝗜" },
  okwallet: { color: "#ffde2d", bgColor: "#ffde2d15", textColor: "#ffde2d", icon: "𝗢" },
  cellfin: { color: "#00803d", bgColor: "#00803d15", textColor: "#00803d", icon: "𝗖" },
  pathaopay: { color: "#3b82de", bgColor: "#3b82de15", textColor: "#3b82de", icon: "𝗣" },
  telecash: { color: "#ed1495", bgColor: "#ed149515", textColor: "#ed1495", icon: "𝗧" },
  aamarpay: { color: "#f39700", bgColor: "#f3970015", textColor: "#f39700", icon: "𝗔" },
  sslcommerz: { color: "#295cab", bgColor: "#295cab15", textColor: "#295cab", icon: "𝗦" },
  shurjopay: { color: "#229454", bgColor: "#22945415", textColor: "#229454", icon: "☀" },
  eps_gateway: { color: "#ee2d42", bgColor: "#ee2d4215", textColor: "#ee2d42", icon: "𝗘" },
  paystation: { color: "#351e53", bgColor: "#351e5315", textColor: "#351e53", icon: "𝗣" },
  stripe: { color: "#635BFF", bgColor: "#635BFF15", textColor: "#635BFF", icon: "𝗦" },
  paypal: { color: "#003087", bgColor: "#00308715", textColor: "#003087", icon: "𝗣" },
  binance: { color: "#f0b90b", bgColor: "#f0b90b15", textColor: "#f0b90b", icon: "𝗕" },
  oxapay: { color: "#1a34c2", bgColor: "#1a34c215", textColor: "#1a34c2", icon: "𝗢" },
  payeer: { color: "#64b3df", bgColor: "#64b3df15", textColor: "#64b3df", icon: "𝗣" },
  payoneer: { color: "#252526", bgColor: "#25252615", textColor: "#252526", icon: "𝗣" },
  wise: { color: "#9fe870", bgColor: "#9fe87015", textColor: "#9fe870", icon: "𝗪" },
  taptapsend: { color: "#6c3baa", bgColor: "#6c3baa15", textColor: "#6c3baa", icon: "𝗧" },
  crypto: { color: "#F0B90B", bgColor: "#F0B90B15", textColor: "#F0B90B", icon: "₿" },
  bank_transfer: { color: "#059669", bgColor: "#05966915", textColor: "#059669", icon: "🏦" },
  razorpay: { color: "#0C2651", bgColor: "#0C265115", textColor: "#0C2651", icon: "𝗥" },
};

// No third-party brand artwork ships with this repo: gateway tiles render as
// monograms + brand colors (see GatewayBrand above). Any logo the merchant
// wants shown is uploaded by them via `image_url`.
const DEFAULT_BRAND: GatewayBrand = {
  color: "#6366F1",
  bgColor: "#6366F115",
  textColor: "#6366F1",
  icon: "⚡",
};

export function getGatewayBrand(gatewayType: string, displayName?: string): GatewayBrand {
  const typeBrand = GATEWAY_BRAND_MAP[gatewayType];
  if (typeBrand) return typeBrand;
  if (displayName) {
    const nameLower = displayName.toLowerCase();
    for (const [key, brand] of Object.entries(GATEWAY_BRAND_MAP)) {
      if (nameLower.includes(key.replace("_", ""))) {
        return brand;
      }
    }
  }
  return DEFAULT_BRAND;
}

export function getGatewayInitial(displayName: string, gatewayType: string): string {
  const brand = getGatewayBrand(gatewayType, displayName);
  return brand.icon;
}

// Helper: find template config by slug
export function getTemplateBySlug(slug: string): GatewayTemplateConfig | undefined {
  return GATEWAY_TEMPLATE_CONFIGS.find(t => t.slug === slug);
}

// Helper: get lang_text for a gateway by matching display_name to templates
export function getGatewayLangText(displayName: string): GatewayLangText | undefined {
  const nameLower = displayName.toLowerCase().replace(/\s+/g, "-");
  const template = GATEWAY_TEMPLATE_CONFIGS.find(t => {
    const slugNorm = t.slug.toLowerCase();
    const titleNorm = t.title.toLowerCase().replace(/\s+/g, "-");
    return slugNorm === nameLower || titleNorm === nameLower || t.title.toLowerCase() === displayName.toLowerCase();
  });
  return template?.lang_text;
}
