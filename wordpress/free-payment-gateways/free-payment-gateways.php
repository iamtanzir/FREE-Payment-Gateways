<?php
/**
 * Plugin Name:       FREE Payment Gateways (Self-Hosted)
 * Plugin URI:        https://github.com/iamtanzir/FREE-Payment-Gateways
 * Description:       Your own Bangla QR + MFS payment system for WordPress/WooCommerce — bKash, Nagad, Rocket, Upay and Bangla QR with manual TrxID verification (100% free), plus optional hosted checkout to your self-hosted gateway server.
 * Version:           1.1.1
 * Author:            iamtanzir
 * License:           AGPL-3.0-only
 * Text Domain:       free-payment-gateways
 * Requires PHP:      7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // No direct access.
}

define( 'FPG_VERSION', '1.1.1' );
define( 'FPG_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );

require_once FPG_PLUGIN_DIR . 'includes/class-fpg-api.php';
require_once FPG_PLUGIN_DIR . 'includes/class-fpg-return-handler.php';
require_once FPG_PLUGIN_DIR . 'includes/class-fpg-shortcode.php';
require_once FPG_PLUGIN_DIR . 'includes/class-fpg-admin-orders.php';

// Declare HPOS (custom order tables) compatibility for this plugin as early as possible.
// The second argument must be the plugin's main file (basename), not a class name.
add_action( 'before_woocommerce_init', function () {
    if ( class_exists( '\Automattic\WooCommerce\Utilities\FeaturesUtil::class' ) ) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', plugin_basename( __FILE__ ), true );
    }
} );

// WooCommerce gateways are loaded only when WooCommerce is present.
add_action( 'plugins_loaded', function () {
    if ( class_exists( 'WooCommerce' ) ) {
        require_once FPG_PLUGIN_DIR . 'includes/class-fpg-woocommerce-gateway.php';
        require_once FPG_PLUGIN_DIR . 'includes/class-fpg-mfs-gateway.php';
        add_filter( 'woocommerce_payment_gateways', function ( $gateways ) {
            $gateways[] = 'FPG_WooCommerce_Gateway';
            $gateways[] = 'FPG_MFS_Gateway';
            return $gateways;
        } );
    }
}, 11 );

/**
 * Settings page under Settings → FPG Gateway.
 */
add_action( 'admin_menu', function () {
    add_options_page( 'FPG Gateway', 'FPG Gateway', 'manage_options', 'fpg-gateway', 'fpg_settings_page' );
} );

add_action( 'admin_init', function () {
    register_setting( 'fpg_gateway', 'fpg_base_url', [ 'sanitize_callback' => 'esc_url_raw', 'default' => '' ] );
    register_setting( 'fpg_gateway', 'fpg_api_key',   [ 'sanitize_callback' => 'sanitize_text_field', 'default' => '' ] );
} );

function fpg_settings_page() {
    if ( ! current_user_can( 'manage_options' ) ) {
        return;
    }
    $base_url = esc_attr( get_option( 'fpg_base_url', '' ) );
    $api_key  = esc_attr( get_option( 'fpg_api_key', '' ) );
    ?>
    <div class="wrap">
        <h1>⚡ FREE Payment Gateways — Settings</h1>
        <p>Connect this site to your self-hosted gateway. <a href="https://github.com/iamtanzir/FREE-Payment-Gateways" target="_blank">Documentation →</a></p>
        <form method="post" action="options.php">
            <?php settings_fields( 'fpg_gateway' ); ?>
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><label for="fpg_base_url">Gateway Base URL</label></th>
                    <td><input type="url" id="fpg_base_url" name="fpg_base_url" value="<?php echo $base_url; ?>" class="regular-text" placeholder="https://pay.yourdomain.com" required></td>
                </tr>
                <tr>
                    <th scope="row"><label for="fpg_api_key">API Key</label></th>
                    <td><input type="password" id="fpg_api_key" name="fpg_api_key" value="<?php echo $api_key; ?>" class="regular-text" autocomplete="off" required>
                    <p class="description">Create one in the gateway admin: <code>/admin → API Keys → Create</code></p></td>
                </tr>
            </table>
            <?php submit_button( 'Save settings' ); ?>
        </form>
        <hr>
        <h2>Shortcode for any page</h2>
        <code>[fpg_pay amount="500" description="Donation" currency="BDT" button="Donate ৳500"]</code>
        <h2>WooCommerce — two gateways, both free</h2>
        <ol>
            <li><strong>FPG Bangla QR &amp; MFS (Manual Verify)</strong> — customers pay by scanning your Bangla QR / sending to your bKash/Nagad/Rocket/Upay number and enter their TrxID at checkout; you approve from the order screen. <em>100% free.</em></li>
            <li><strong>FPG Self-Hosted Gateway</strong> — customers are redirected to your hosted checkout on the self-hosted gateway server.</li>
        </ol>
        <p>Configure the first under <em>WooCommerce → Settings → Payments → “FPG Bangla QR &amp; MFS (Manual Verify)”</em> (enable each method, set your numbers / QR image URLs). Approve pending payments from any order screen — an “FPG MFS payment — verification needed” box appears with Approve/Reject buttons.</p>
    </div>
    <?php
}
