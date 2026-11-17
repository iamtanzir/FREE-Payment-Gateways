import { X, ChevronDown, Check } from "lucide-react";

export interface CheckoutPreviewProps {
  brandName: string;
  brandLogo: string | null;
  theme: {
    border_radius: string;
    card_shadow: string;
    font_family: string;
    bg_color: string;
    card_bg_color: string;
    text_color: string;
    muted_color: string;
    border_color: string;
    accent_color: string;
    button_style: string;
    button_radius: string;
    show_order_details: string;
    show_powered_by: string;
    header_style: string;
    gateway_columns: string;
    show_gateway_names: string;
    watermark_text: string;
    footer_links: string;
    show_nav_buttons: string;
    pl_button_text: string;
  };
}

const GATEWAY_SAMPLES = [
  { name: "bKash", color: "#E2136E" },
  { name: "Nagad", color: "#F6921E" },
  { name: "Rocket", color: "#8C3494" },
];

function getShadowStyle(s: string) {
  if (s === "none") return "none";
  if (s === "md") return "0 4px 6px -1px rgba(0,0,0,0.1)";
  if (s === "lg") return "0 10px 15px -3px rgba(0,0,0,0.1)";
  return "0 1px 2px rgba(0,0,0,0.05)";
}

export default function CheckoutPreview({ brandName, brandLogo, theme }: CheckoutPreviewProps) {
  const t = theme;

  return (
    <div
      className="p-4 overflow-hidden"
      style={{
        background: t.bg_color,
        fontFamily: `'${t.font_family}', sans-serif`,
        borderRadius: "0 0 0.5rem 0.5rem",
        minHeight: 420,
      }}
    >
      <div className="mx-auto max-w-[360px]">
        {/* Brand Header */}
        <div className={`flex items-center gap-2 mb-3 ${t.header_style === "centered" ? "justify-center flex-col" : ""}`}>
          {brandLogo ? (
            <img src={brandLogo} alt={brandName} className="h-[30px] w-[30px] rounded-[6px] object-cover" />
          ) : (
            <div
              className="h-[30px] w-[30px] rounded-[6px] flex items-center justify-center text-xs font-bold"
              style={{ background: t.accent_color, color: t.card_bg_color }}
            >
              {brandName.charAt(0)}
            </div>
          )}
          {t.header_style !== "minimal" && (
            <span className="text-[13px] font-semibold" style={{ color: t.text_color }}>
              {brandName}
            </span>
          )}
        </div>

        {/* Nav Bar */}
        <div
          className="mb-3 p-2.5 flex items-center justify-between"
          style={{
            background: t.card_bg_color,
            borderRadius: `${t.border_radius}px`,
            border: `1px solid ${t.border_color}`,
            boxShadow: getShadowStyle(t.card_shadow),
          }}
        >
          <button className="flex items-center gap-1 text-xs" style={{ color: t.muted_color }}>
            <X className="h-3 w-3" /> Cancel
          </button>
          <div className="flex gap-1">
            {(t.show_nav_buttons === "all" || t.show_nav_buttons === "faq") && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-medium" style={{ color: t.muted_color }}>
                FAQ
              </span>
            )}
            {(t.show_nav_buttons === "all" || t.show_nav_buttons === "support") && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-medium" style={{ color: t.muted_color }}>
                Support
              </span>
            )}
            <span
              className="px-2.5 py-1 rounded-full text-[10px] font-medium"
              style={{ background: t.accent_color, color: t.card_bg_color }}
            >
              Pay
            </span>
          </div>
        </div>

        {/* Main Card */}
        <div
          className="mb-3 overflow-hidden"
          style={{
            background: t.card_bg_color,
            borderRadius: `${t.border_radius}px`,
            border: `1px solid ${t.border_color}`,
            boxShadow: getShadowStyle(t.card_shadow),
          }}
        >
          <div className="flex" style={{ borderBottom: `1px solid ${t.border_color}` }}>
            <div className="flex-1 p-3" style={{ borderRight: `1px solid ${t.border_color}` }}>
              <p className="text-[9px] uppercase tracking-wider font-medium mb-0.5" style={{ color: t.muted_color }}>
                INVOICE
              </p>
              <p className="text-[10px] font-mono" style={{ color: t.muted_color }}>
                TXN-A1B2C3
              </p>
            </div>
            <div className="flex-1 p-3 text-right">
              <p className="text-[18px] font-bold" style={{ color: t.text_color }}>500</p>
              <p className="text-[11px]" style={{ color: t.muted_color }}>BDT</p>
            </div>
          </div>

          <div className="p-3">
            <div className="flex gap-1 mb-3">
              <span
                className="px-3 py-1.5 text-[10px] font-medium"
                style={{ background: t.accent_color, color: t.card_bg_color, borderRadius: `${t.button_radius}px` }}
              >
                MFS
              </span>
              <span
                className="px-3 py-1.5 text-[10px] font-medium"
                style={{ background: `${t.border_color}40`, color: t.muted_color, borderRadius: `${t.button_radius}px` }}
              >
                BANK
              </span>
            </div>

            {/* Classic layout */}
            {!["compact", "card"].includes(t.gateway_columns) && (
              <div className="grid grid-cols-2 gap-2">
                {GATEWAY_SAMPLES.map((gw) => (
                  <div
                    key={gw.name}
                    className="p-2 text-center"
                    style={{
                      border: `1px solid ${t.border_color}`,
                      borderRadius: `${Math.min(parseInt(t.border_radius), 10)}px`,
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold mx-auto mb-1"
                      style={{ background: gw.color, color: "#fff" }}
                    >
                      {gw.name[0]}
                    </div>
                    {t.show_gateway_names === "enabled" && (
                      <p className="text-[10px] font-medium truncate" style={{ color: t.text_color }}>
                        {gw.name}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Compact list layout */}
            {t.gateway_columns === "compact" && (
              <div className="space-y-1.5">
                {GATEWAY_SAMPLES.map((gw) => (
                  <div
                    key={gw.name}
                    className="flex items-center gap-2 p-1.5"
                    style={{
                      border: `1px solid ${t.border_color}`,
                      borderRadius: `${Math.min(parseInt(t.border_radius), 8)}px`,
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold shrink-0"
                      style={{ background: gw.color, color: "#fff" }}
                    >
                      {gw.name[0]}
                    </div>
                    <p className="text-[10px] font-medium truncate" style={{ color: t.text_color }}>
                      {gw.name}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Card grid layout */}
            {t.gateway_columns === "card" && (
              <div className="grid grid-cols-3 gap-1.5">
                {GATEWAY_SAMPLES.map((gw) => (
                  <div
                    key={gw.name}
                    className="p-1.5 text-center"
                    style={{
                      border: `1px solid ${t.border_color}`,
                      borderRadius: `${Math.min(parseInt(t.border_radius), 10)}px`,
                      background: `${gw.color}10`,
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold mx-auto mb-0.5"
                      style={{ background: gw.color, color: "#fff" }}
                    >
                      {gw.name[0]}
                    </div>
                    <p className="text-[8px] font-medium truncate" style={{ color: t.text_color }}>
                      {gw.name}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Order Details */}
        {t.show_order_details === "true" && (
          <div
            className="mb-3 p-3"
            style={{
              background: t.card_bg_color,
              borderRadius: `${t.border_radius}px`,
              border: `1px solid ${t.border_color}`,
              boxShadow: getShadowStyle(t.card_shadow),
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold" style={{ color: t.text_color }}>
                Order Details
              </span>
              <ChevronDown className="h-3 w-3" style={{ color: t.muted_color }} />
            </div>
          </div>
        )}

        {/* Pay Button */}
        <div className="mb-3">
          <button
            className="w-full py-2.5 text-[12px] font-semibold transition-all"
            style={{
              borderRadius: `${t.button_radius}px`,
              ...(t.button_style === "filled"
                ? { background: t.accent_color, color: t.card_bg_color, border: "none" }
                : t.button_style === "outline"
                ? { background: "transparent", color: t.accent_color, border: `2px solid ${t.accent_color}` }
                : {
                    background: `linear-gradient(135deg, ${t.accent_color}, ${t.accent_color}cc)`,
                    color: t.card_bg_color,
                    border: "none",
                  }),
            }}
          >
            {t.pl_button_text || "Pay Now"}
          </button>
        </div>

        {/* Footer */}
        {t.show_powered_by === "true" && (
          <p className="text-center text-[10px]" style={{ color: t.muted_color }}>
            {t.watermark_text || `Secured by ${brandName}`}
          </p>
        )}
        {t.footer_links && (
          <p
            className="text-center text-[9px] mt-1"
            style={{ color: t.muted_color }}
            dangerouslySetInnerHTML={{ __html: t.footer_links }}
          />
        )}
      </div>
    </div>
  );
}
