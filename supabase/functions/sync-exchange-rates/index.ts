import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CURRENCY_INFO: Record<string, { name: string; symbol: string }> = {
  AED: { name: "UAE Dirham", symbol: "د.إ" },
  AFN: { name: "Afghan Afghani", symbol: "؋" },
  ALL: { name: "Albanian Lek", symbol: "L" },
  AMD: { name: "Armenian Dram", symbol: "֏" },
  ANG: { name: "Netherlands Antillean Guilder", symbol: "ƒ" },
  AOA: { name: "Angolan Kwanza", symbol: "Kz" },
  ARS: { name: "Argentine Peso", symbol: "$" },
  AUD: { name: "Australian Dollar", symbol: "A$" },
  AWG: { name: "Aruban Florin", symbol: "ƒ" },
  AZN: { name: "Azerbaijani Manat", symbol: "₼" },
  BAM: { name: "Bosnia-Herzegovina Convertible Mark", symbol: "KM" },
  BBD: { name: "Barbadian Dollar", symbol: "Bds$" },
  BDT: { name: "Bangladeshi Taka", symbol: "৳" },
  BGN: { name: "Bulgarian Lev", symbol: "лв" },
  BHD: { name: "Bahraini Dinar", symbol: "BD" },
  BIF: { name: "Burundian Franc", symbol: "FBu" },
  BMD: { name: "Bermudan Dollar", symbol: "$" },
  BND: { name: "Brunei Dollar", symbol: "B$" },
  BOB: { name: "Bolivian Boliviano", symbol: "Bs." },
  BRL: { name: "Brazilian Real", symbol: "R$" },
  BSD: { name: "Bahamian Dollar", symbol: "$" },
  BTN: { name: "Bhutanese Ngultrum", symbol: "Nu." },
  BWP: { name: "Botswanan Pula", symbol: "P" },
  BYN: { name: "Belarusian Ruble", symbol: "Br" },
  BZD: { name: "Belize Dollar", symbol: "BZ$" },
  CAD: { name: "Canadian Dollar", symbol: "C$" },
  CDF: { name: "Congolese Franc", symbol: "FC" },
  CHF: { name: "Swiss Franc", symbol: "CHF" },
  CLP: { name: "Chilean Peso", symbol: "$" },
  CNY: { name: "Chinese Yuan", symbol: "¥" },
  COP: { name: "Colombian Peso", symbol: "$" },
  CRC: { name: "Costa Rican Colón", symbol: "₡" },
  CUP: { name: "Cuban Peso", symbol: "$" },
  CVE: { name: "Cape Verdean Escudo", symbol: "$" },
  CZK: { name: "Czech Koruna", symbol: "Kč" },
  DJF: { name: "Djiboutian Franc", symbol: "Fdj" },
  DKK: { name: "Danish Krone", symbol: "kr" },
  DOP: { name: "Dominican Peso", symbol: "RD$" },
  DZD: { name: "Algerian Dinar", symbol: "د.ج" },
  EGP: { name: "Egyptian Pound", symbol: "E£" },
  ERN: { name: "Eritrean Nakfa", symbol: "Nfk" },
  ETB: { name: "Ethiopian Birr", symbol: "Br" },
  EUR: { name: "Euro", symbol: "€" },
  FJD: { name: "Fijian Dollar", symbol: "FJ$" },
  FKP: { name: "Falkland Islands Pound", symbol: "£" },
  GBP: { name: "British Pound", symbol: "£" },
  GEL: { name: "Georgian Lari", symbol: "₾" },
  GHS: { name: "Ghanaian Cedi", symbol: "GH₵" },
  GIP: { name: "Gibraltar Pound", symbol: "£" },
  GMD: { name: "Gambian Dalasi", symbol: "D" },
  GNF: { name: "Guinean Franc", symbol: "FG" },
  GTQ: { name: "Guatemalan Quetzal", symbol: "Q" },
  GYD: { name: "Guyanaese Dollar", symbol: "GY$" },
  HKD: { name: "Hong Kong Dollar", symbol: "HK$" },
  HNL: { name: "Honduran Lempira", symbol: "L" },
  HRK: { name: "Croatian Kuna", symbol: "kn" },
  HTG: { name: "Haitian Gourde", symbol: "G" },
  HUF: { name: "Hungarian Forint", symbol: "Ft" },
  IDR: { name: "Indonesian Rupiah", symbol: "Rp" },
  ILS: { name: "Israeli New Shekel", symbol: "₪" },
  INR: { name: "Indian Rupee", symbol: "₹" },
  IQD: { name: "Iraqi Dinar", symbol: "ع.د" },
  IRR: { name: "Iranian Rial", symbol: "﷼" },
  ISK: { name: "Icelandic Króna", symbol: "kr" },
  JMD: { name: "Jamaican Dollar", symbol: "J$" },
  JOD: { name: "Jordanian Dinar", symbol: "JD" },
  JPY: { name: "Japanese Yen", symbol: "¥" },
  KES: { name: "Kenyan Shilling", symbol: "KSh" },
  KGS: { name: "Kyrgystani Som", symbol: "сом" },
  KHR: { name: "Cambodian Riel", symbol: "៛" },
  KMF: { name: "Comorian Franc", symbol: "CF" },
  KRW: { name: "South Korean Won", symbol: "₩" },
  KWD: { name: "Kuwaiti Dinar", symbol: "KD" },
  KYD: { name: "Cayman Islands Dollar", symbol: "CI$" },
  KZT: { name: "Kazakhstani Tenge", symbol: "₸" },
  LAK: { name: "Laotian Kip", symbol: "₭" },
  LBP: { name: "Lebanese Pound", symbol: "L£" },
  LKR: { name: "Sri Lankan Rupee", symbol: "Rs" },
  LRD: { name: "Liberian Dollar", symbol: "L$" },
  LSL: { name: "Lesotho Loti", symbol: "L" },
  LYD: { name: "Libyan Dinar", symbol: "LD" },
  MAD: { name: "Moroccan Dirham", symbol: "MAD" },
  MDL: { name: "Moldovan Leu", symbol: "L" },
  MGA: { name: "Malagasy Ariary", symbol: "Ar" },
  MKD: { name: "Macedonian Denar", symbol: "ден" },
  MMK: { name: "Myanmar Kyat", symbol: "K" },
  MNT: { name: "Mongolian Tugrik", symbol: "₮" },
  MOP: { name: "Macanese Pataca", symbol: "MOP$" },
  MRU: { name: "Mauritanian Ouguiya", symbol: "UM" },
  MUR: { name: "Mauritian Rupee", symbol: "Rs" },
  MVR: { name: "Maldivian Rufiyaa", symbol: "Rf" },
  MWK: { name: "Malawian Kwacha", symbol: "MK" },
  MXN: { name: "Mexican Peso", symbol: "MX$" },
  MYR: { name: "Malaysian Ringgit", symbol: "RM" },
  MZN: { name: "Mozambican Metical", symbol: "MT" },
  NAD: { name: "Namibian Dollar", symbol: "N$" },
  NGN: { name: "Nigerian Naira", symbol: "₦" },
  NIO: { name: "Nicaraguan Córdoba", symbol: "C$" },
  NOK: { name: "Norwegian Krone", symbol: "kr" },
  NPR: { name: "Nepalese Rupee", symbol: "Rs" },
  NZD: { name: "New Zealand Dollar", symbol: "NZ$" },
  OMR: { name: "Omani Rial", symbol: "OMR" },
  PAB: { name: "Panamanian Balboa", symbol: "B/." },
  PEN: { name: "Peruvian Sol", symbol: "S/." },
  PGK: { name: "Papua New Guinean Kina", symbol: "K" },
  PHP: { name: "Philippine Peso", symbol: "₱" },
  PKR: { name: "Pakistani Rupee", symbol: "Rs" },
  PLN: { name: "Polish Zloty", symbol: "zł" },
  PYG: { name: "Paraguayan Guarani", symbol: "₲" },
  QAR: { name: "Qatari Rial", symbol: "QR" },
  RON: { name: "Romanian Leu", symbol: "lei" },
  RSD: { name: "Serbian Dinar", symbol: "din." },
  RUB: { name: "Russian Ruble", symbol: "₽" },
  RWF: { name: "Rwandan Franc", symbol: "RF" },
  SAR: { name: "Saudi Riyal", symbol: "SAR" },
  SBD: { name: "Solomon Islands Dollar", symbol: "SI$" },
  SCR: { name: "Seychellois Rupee", symbol: "Rs" },
  SDG: { name: "Sudanese Pound", symbol: "SDG" },
  SEK: { name: "Swedish Krona", symbol: "kr" },
  SGD: { name: "Singapore Dollar", symbol: "S$" },
  SHP: { name: "Saint Helena Pound", symbol: "£" },
  SLE: { name: "Sierra Leonean Leone", symbol: "Le" },
  SOS: { name: "Somali Shilling", symbol: "Sh" },
  SRD: { name: "Surinamese Dollar", symbol: "SRD" },
  SSP: { name: "South Sudanese Pound", symbol: "£" },
  STN: { name: "São Tomé and Príncipe Dobra", symbol: "Db" },
  SYP: { name: "Syrian Pound", symbol: "£S" },
  SZL: { name: "Swazi Lilangeni", symbol: "E" },
  THB: { name: "Thai Baht", symbol: "฿" },
  TJS: { name: "Tajikistani Somoni", symbol: "SM" },
  TMT: { name: "Turkmenistani Manat", symbol: "T" },
  TND: { name: "Tunisian Dinar", symbol: "DT" },
  TOP: { name: "Tongan Paʻanga", symbol: "T$" },
  TRY: { name: "Turkish Lira", symbol: "₺" },
  TTD: { name: "Trinidad & Tobago Dollar", symbol: "TT$" },
  TWD: { name: "New Taiwan Dollar", symbol: "NT$" },
  TZS: { name: "Tanzanian Shilling", symbol: "TSh" },
  UAH: { name: "Ukrainian Hryvnia", symbol: "₴" },
  UGX: { name: "Ugandan Shilling", symbol: "USh" },
  USD: { name: "US Dollar", symbol: "$" },
  UYU: { name: "Uruguayan Peso", symbol: "$U" },
  UZS: { name: "Uzbekistani Som", symbol: "сўм" },
  VES: { name: "Venezuelan Bolívar", symbol: "Bs.S" },
  VND: { name: "Vietnamese Dong", symbol: "₫" },
  VUV: { name: "Vanuatu Vatu", symbol: "VT" },
  WST: { name: "Samoan Tala", symbol: "WS$" },
  XAF: { name: "Central African CFA Franc", symbol: "FCFA" },
  XCD: { name: "East Caribbean Dollar", symbol: "EC$" },
  XOF: { name: "West African CFA Franc", symbol: "CFA" },
  XPF: { name: "CFP Franc", symbol: "₣" },
  YER: { name: "Yemeni Rial", symbol: "﷼" },
  ZAR: { name: "South African Rand", symbol: "R" },
  ZMW: { name: "Zambian Kwacha", symbol: "ZK" },
  ZWL: { name: "Zimbabwean Dollar", symbol: "Z$" },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    ).auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { organization_id } = await req.json()
    if (!organization_id) {
      return new Response(JSON.stringify({ error: 'organization_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch live rates with BDT as base
    const rateRes = await fetch('https://api.exchangerate-api.com/v4/latest/BDT')
    if (!rateRes.ok) {
      throw new Error(`Exchange rate API error: ${rateRes.status}`)
    }
    const rateData = await rateRes.json()
    const rates: Record<string, number> = rateData.rates

    // Delete all existing currencies for this org, then bulk insert fresh data
    // This is much faster than individual updates
    const now = new Date().toISOString()
    const toInsert: any[] = []

    for (const [code, rate] of Object.entries(rates)) {
      const info = CURRENCY_INFO[code]
      if (!info) continue
      toInsert.push({
        organization_id,
        code,
        name: info.name,
        symbol: info.symbol,
        exchange_rate: rate,
        is_active: true,
        created_at: now,
        updated_at: now,
      })
    }

    // Delete existing then insert all at once
    await supabase.from('currencies').delete().eq('organization_id', organization_id)

    if (toInsert.length > 0) {
      const { error } = await supabase.from('currencies').insert(toInsert)
      if (error) throw error
    }

    return new Response(JSON.stringify({
      message: `Synced ${toInsert.length} currencies successfully`,
      count: toInsert.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
