// Two-axis screenshot classification taxonomy — the ONLY valid labels.
// Sole source of truth (system prompt §4). Bump TAXONOMY_VERSION on any change.

export const TAXONOMY_VERSION = "2026-07-01";

// ---- Axis A: Functional Area ("area:screen") ----
export const AXIS_A_AREAS: Record<string, string[]> = {
  onboarding_auth: ["splash", "welcome_carousel", "region_select", "signup", "login", "password_reset", "otp_verify", "twofa_setup", "twofa_challenge", "biometric_enroll", "pin_entry", "antiphishing_setup"],
  kyc: ["intro", "personal_info", "doc_type_select", "doc_capture", "selfie_liveness", "proof_of_address", "in_review", "result", "edd_request", "source_of_funds"],
  home: ["dashboard", "portfolio_summary", "allocation_breakdown", "quick_actions", "feed", "promo_banners", "empty_home"],
  markets: ["markets_list", "market_tabs", "watchlist", "search", "search_results", "coin_detail", "price_chart_full", "coin_info", "news", "market_summary", "sentiment"],
  spot_trading: ["buy_sell_simple", "order_type_select", "order_entry", "order_book", "recent_trades", "depth_chart", "pro_terminal", "order_review", "order_success", "open_orders", "order_history", "trade_history", "tpsl_setup"],
  convert: ["convert", "quote_preview", "confirm_success", "history"],
  derivatives: ["futures_terminal", "contract_select", "leverage", "margin_mode", "position_list", "position_detail", "funding_info", "liquidation_risk", "pnl"],
  automation: ["dca_setup", "dca_list", "dca_detail", "alert_setup", "alert_list"],
  wallet: ["overview", "holdings", "asset_detail", "account_transfer", "tx_history", "tx_detail", "address_book", "balance_settings"],
  deposit: ["landing", "coin_select", "network_select", "address_qr", "fiat_method_select", "bank_instructions", "card_form", "amount_entry", "status"],
  withdraw: ["landing", "coin_select", "address_entry", "network_select", "amount_entry", "fiat_bank_select", "review", "security_verify", "status"],
  earn: ["hub", "product_detail", "subscribe", "redeem", "rewards_history", "autoinvest_setup", "launchpad", "product_lists"],
  payments_p2p_card: ["buy_with_card", "p2p_marketplace", "p2p_offer_detail", "p2p_order", "p2p_chat", "merchant_ads", "payment_methods", "card_overview", "card_detail", "send_pay"],
  web3: ["wallet_home", "create_import", "seed_backup", "token_list", "dapp_browser", "onchain_swap", "bridge", "nft_gallery", "connect_wallet", "sign_tx"],
  account_settings: ["profile_home", "security_overview", "security_settings", "sessions_devices", "notification_settings", "preferences", "fee_tier", "subaccounts", "api_keys", "referral", "rewards_center", "verification_status", "payment_methods", "linked_accounts"],
  notifications: ["inbox", "detail", "announcements", "messages"],
  support_info: ["help_center", "article_detail", "support_chat", "submit_ticket", "ticket_list", "contact_about", "legal", "app_info", "feedback"],
  system: ["maintenance", "force_update", "network_error", "geo_block", "session_expired"],
};

// ---- Axis B: UI Screen Type ("ui:type") grouped base | overlay | state ----
export const AXIS_B_GROUPS: Record<string, string[]> = {
  base: ["ui:dashboard", "ui:list_feed", "ui:detail", "ui:data_table", "ui:chart", "ui:form", "ui:amount_entry", "ui:review", "ui:result_status", "ui:wizard_step", "ui:search_filter", "ui:onboarding_marketing", "ui:auth_gate", "ui:settings_menu", "ui:qr_scanner", "ui:chat"],
  overlay: ["ui:modal", "ui:bottom_sheet", "ui:selector", "ui:toast_banner", "ui:signing_sheet"],
  state: ["ui:empty_state", "ui:loading_skeleton", "ui:error_blocking"],
};

// Out-of-scope escape hatch for Axis A only (§5.6). Never invent other labels.
export const OUT_OF_SCOPE_A = "unclassified:out_of_scope";

// ---- Derived flat sets + helpers ----
export const AXIS_A_LABELS: string[] = Object.entries(AXIS_A_AREAS).flatMap(
  ([area, screens]) => screens.map((s) => `${area}:${s}`)
);
export const AXIS_B_LABELS: string[] = Object.values(AXIS_B_GROUPS).flat();

export const AXIS_B_OVERLAY = new Set(AXIS_B_GROUPS.overlay);

const AXIS_A_SET = new Set([...AXIS_A_LABELS, OUT_OF_SCOPE_A]);
const AXIS_B_SET = new Set(AXIS_B_LABELS);

export const isValidAxisA = (label: string) => AXIS_A_SET.has(label);
export const isValidAxisB = (label: string) => AXIS_B_SET.has(label);

export function axisBGroup(label: string): "base" | "overlay" | "state" | null {
  for (const g of ["base", "overlay", "state"] as const) {
    if (AXIS_B_GROUPS[g].includes(label)) return g;
  }
  return null;
}

export function axisAArea(label: string): string | null {
  const [area] = label.split(":");
  return AXIS_A_AREAS[area] ? area : label === OUT_OF_SCOPE_A ? "unclassified" : null;
}

// display: "withdraw:address_entry" -> "Withdraw / Address Entry"
export function displayLabel(label: string): string {
  const [a, b] = label.replace(/^ui:/, "ui:").split(":");
  const titl = (s: string) => s.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  if (label.startsWith("ui:")) return `UI: ${titl(label.slice(3))}`;
  return `${titl(a)} / ${titl(b)}`;
}
