<?php
/**
 * Plugin smoke test — runs the WordPress plugin WITHOUT WordPress installed.
 *
 * Stubs the WordPress/WooCommerce APIs the plugin uses, then includes every
 * plugin file and exercises the two payment gateways end-to-end:
 * construction, checkout field rendering, validation, order placement,
 * manual TrxID verification box, shortcode rendering.
 *
 * Usage:  php test/plugin-smoke.php   (exit code 0 = pass)
 */

// ── WordPress / WooCommerce stubs ───────────────────────────────────
$GLOBALS['__hooks']     = [];
$GLOBALS['__notices']   = [];
$GLOBALS['__shortcode'] = [];

define( 'ABSPATH', sys_get_temp_dir() . '/fake-wp/' );

function __( $s, $d = null ) { return $s; }
function esc_html__( $s, $d = null ) { return htmlspecialchars( (string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8' ); }
function esc_html( $s )    { return htmlspecialchars( (string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8' ); }
function esc_attr( $s )    { return htmlspecialchars( (string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8' ); }
function esc_url( $u )     { return (string) $u; }
function esc_url_raw( $u ) { return (string) $u; }
function sanitize_text_field( $s ) { return trim( strip_tags( (string) $s ) ); }
function wp_unslash( $s )  { return $s; }
function absint( $n )      { return abs( (int) $n ); }
function wp_json_encode( $d ) { return json_encode( $d ); }
function get_option( $k, $d = '' ) { return $d; }
function plugin_dir_path( $f ) { return rtrim( str_replace( '\\', '/', dirname( $f ) ), '/' ) . '/'; }
function add_action( $hook, $cb, $p = 10, $a = 1 ) { $GLOBALS['__hooks'][ $hook ][] = $cb; return true; }
function add_filter( $hook, $cb, $p = 10, $a = 1 ) { $GLOBALS['__hooks'][ $hook ][] = $cb; return true; }
function do_action( $hook, ...$args ) { foreach ( $GLOBALS['__hooks'][ $hook ] ?? [] as $cb ) { call_user_func( $cb, ...$args ); } }
function apply_filters( $hook, $value ) { foreach ( $GLOBALS['__hooks'][ $hook ] ?? [] as $cb ) { $value = call_user_func( $cb, $value ); } return $value; }
function add_shortcode( $tag, $cb ) { $GLOBALS['__shortcode'][ $tag ] = $cb; }
function shortcode_atts( $defaults, $atts, $tag = '' ) { return array_merge( $defaults, (array) $atts ); }
function register_setting() {}
function settings_fields() {}
function submit_button() {}
function add_options_page() {}
function current_user_can( $c ) { return true; }
function admin_url( $p = '' ) { return 'https://example.test/wp-admin/' . ltrim( $p, '/' ); }
function home_url( $p = '' )  { return 'https://example.test' . $p; }
function wp_nonce_url( $u, $a = '', $n = '_wpnonce' ) { return $u . ( strpos( $u, '?' ) === false ? '?' : '&' ) . $n . '=testnonce'; }
function wp_nonce_field( $a, $n = '_wpnonce' ) { echo '<input type="hidden" name="' . esc_attr( $n ) . '" value="testnonce" />'; }
function wp_kses_post( $s )   { return $s; }
function wpautop( $s )        { return '<p>' . $s . '</p>'; }
function wc_price( $n )       { return '৳' . number_format( (float) $n, 2 ); }
function wc_add_notice( $m, $t ) { $GLOBALS['__notices'][] = $t . ': ' . $m; }
function add_query_arg( ...$args ) {
    if ( is_array( $args[0] ) ) { $params = $args[0]; $url = $args[1] ?? home_url( '/' ); }
    else { [ $k, $v, $url ] = $args; $params = [ $k => $v ]; }
    $parts = parse_url( $url ); $base = ( $parts['scheme'] ?? 'https' ) . '://' . ( $parts['host'] ?? 'example.test' ) . ( $parts['path'] ?? '/' );
    parse_str( $parts['query'] ?? '', $out );
    return $base . '?' . http_build_query( array_merge( $out, $params ) );
}
function status_header() {}
function nocache_headers() {}

class FakeCart {
    public $emptied = false;
    public function get_total( $ctx = 'view' ) { return '500.00'; }
    public function empty_cart() { $this->emptied = true; }
}
class FakeWC {
    public $cart;
    public function __construct() { $this->cart = new FakeCart(); }
}
$GLOBALS['__wc'] = new FakeWC();
function WC() { return $GLOBALS['__wc']; }

class FakeOrder {
    public $meta   = [];
    public $status = 'pending';
    public $notes  = [];
    public function get_id()  { return 12345; }
    public function get_order_key() { return 'wc_order_fake123'; }
    public function get_meta( $k )  { return $this->meta[ $k ] ?? ''; }
    public function update_meta_data( $k, $v ) { $this->meta[ $k ] = $v; }
    public function update_status( $s, $note = '' ) { $this->status = $s; if ( $note ) $this->notes[] = $note; }
    public function add_order_note( $n ) { $this->notes[] = $n; }
    public function get_status() { return $this->status; }
    public function is_paid() { return in_array( $this->status, [ 'completed', 'processing' ], true ); }
    public function payment_complete() { $this->status = 'completed'; }
    public function save() {}
    public function get_total() { return '500.00'; }
    public function get_currency() { return 'BDT'; }
    public function get_order_number() { return '12345'; }
    public function get_billing_first_name() { return 'Test'; }
    public function get_billing_last_name()  { return 'Customer'; }
    public function get_billing_email() { return 'customer@example.test'; }
    public function get_billing_phone() { return '01700000000'; }
    public function get_checkout_order_received_url() { return 'https://example.test/order-received/12345/'; }
    public function get_edit_order_url() { return 'https://example.test/wp-admin/post.php?post=12345&action=edit'; }
}
$GLOBALS['__order'] = new FakeOrder();
function wc_get_order( $id ) { return $GLOBALS['__order']; }

class WC_Payment_Gateway {
    public $id = '';
    public $method_title = '';
    public $method_description = '';
    public $icon = '';
    public $has_fields = false;
    public $supports = [];
    public $title = '';
    public $description = '';
    public $instructions = '';
    public $enabled = 'no';
    public $settings = [];
    public function init_form_fields() {}
    public function init_settings() { $this->settings = []; } // no stored options → pure defaults
    public function get_option( $k, $d = '' ) { return array_key_exists( $k, $this->settings ) ? $this->settings[ $k ] : $d; }
    public function get_return_url( $order = null ) { return 'https://example.test/thankyou'; }
    public function process_admin_options() {}
}
class WooCommerce {}

// ── Assertions ──────────────────────────────────────────────────────
function check( $cond, $label ) {
    if ( ! $cond ) {
        fwrite( STDERR, "❌ FAIL: $label\n" );
        exit( 1 );
    }
    echo "✓ $label\n";
}

// ── Include the plugin (top-level registration) ─────────────────────
require __DIR__ . '/../wordpress/free-payment-gateways/free-payment-gateways.php';
echo "✓ plugin file loads without fatal errors\n";

// Fire lifecycle hook — registers both gateways when WooCommerce is present
do_action( 'plugins_loaded' );
$gateways = apply_filters( 'woocommerce_payment_gateways', [] );
check( in_array( 'FPG_WooCommerce_Gateway', $gateways, true ), 'hosted gateway registered with WooCommerce' );
check( in_array( 'FPG_MFS_Gateway', $gateways, true ), 'Bangla QR & MFS gateway registered with WooCommerce' );
check( isset( $GLOBALS['__shortcode']['fpg_pay'] ), '[fpg_pay] shortcode registered' );

// ── Hosted redirect gateway constructs ──────────────────────────────
$hosted = new FPG_WooCommerce_Gateway();
check( $hosted->id === 'fpg_gateway', 'hosted gateway id is fpg_gateway' );
check( $hosted->enabled === 'no', 'hosted gateway default disabled (safe default)' );

// ── MFS / Bangla QR gateway: render + full order flow ───────────────
$mfs = new FPG_MFS_Gateway();
check( $mfs->id === 'fpg_mfs', 'MFS gateway id is fpg_mfs' );
check( $mfs->is_available() === false, 'MFS gateway disabled until enabled (safe default)' );
$mfs->enabled = 'yes';
check( $mfs->is_available() === true, 'MFS gateway available when enabled' );

ob_start();
$mfs->payment_fields();
$html = ob_get_clean();
check( strpos( $html, 'fpg_mfs_method' ) !== false, 'checkout renders method selector' );
check( strpos( $html, 'fpg_mfs_trx' ) !== false, 'checkout renders TrxID field' );
check( strpos( $html, 'bKash' ) !== false && strpos( $html, 'Bangla QR' ) !== false, 'checkout renders all method options' );

$_POST = [ 'fpg_mfs_method' => 'bkash', 'fpg_mfs_sender' => '01711111111', 'fpg_mfs_trx' => 'smoketry123' ];
check( $mfs->validate_fields() === true, 'validate_fields accepts a valid TrxID' );

$_POST['fpg_mfs_trx'] = 'x';
check( $mfs->validate_fields() === false, 'validate_fields rejects a too-short TrxID' );

$_POST = [ 'fpg_mfs_method' => 'bkash', 'fpg_mfs_sender' => '01711111111', 'fpg_mfs_trx' => 'SMOKETRY123' ];
$result = $mfs->process_payment( 12345 );
check( is_array( $result ) && $result['result'] === 'success', 'process_payment returns success + redirect' );
check( wc_get_order( 12345 )->get_status() === 'on-hold', 'order set to on-hold' );
check( wc_get_order( 12345 )->get_meta( '_fpg_mfs_trx' ) === 'SMOKETRY123', 'TrxID stored on order (upper-cased)' );
check( WC()->cart->emptied === true, 'cart emptied after checkout' );

// Admin verification box renders with Approve/Reject for on-hold orders
$order = wc_get_order( 12345 );
ob_start();
FPG_Admin_Orders::render_metabox( $order );
$metabox = ob_get_clean();
check( strpos( $metabox, 'SMOKETRY123' ) !== false, 'admin order box shows TrxID' );
check( strpos( $metabox, 'fpg_mfs_approve' ) !== false, 'admin order box shows Approve button' );
check( strpos( $metabox, 'fpg_mfs_reject' ) !== false, 'admin order box shows Reject button' );

// ── Shortcode renders a working pay form ────────────────────────────
$shortcode_html = FPG_Shortcode::render( [ 'amount' => '500', 'button' => 'Pay ৳500' ] );
check( strpos( $shortcode_html, 'admin-post.php' ) !== false, 'shortcode form posts to admin-post.php' );
check( strpos( $shortcode_html, 'fpg_pay_nonce' ) !== false, 'shortcode form includes nonce' );
check( strpos( $shortcode_html, 'Pay ৳500' ) !== false, 'shortcode button label rendered' );
$bad = FPG_Shortcode::render( [ 'amount' => '-5' ] );
check( strpos( $bad, 'amount must be greater than 0' ) !== false, 'shortcode rejects non-positive amount' );

echo "\n✅ PLUGIN SMOKE TEST PASSED — WordPress plugin is load-safe and functional.\n";
