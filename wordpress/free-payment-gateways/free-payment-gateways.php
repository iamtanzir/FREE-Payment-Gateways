<?php
/**
 * Plugin Name:       FREE Payment Gateways (Self-Hosted)
 * Plugin URI:        https://github.com/iamtanzir/FREE-Payment-Gateways
 * Description:       Connect your self-hosted FREE-Payment-Gateways server to WordPress and WooCommerce. Zero monthly fees — bKash/Nagad/Rocket/Bank (manual verification), BTCPay (crypto), Stripe and demo payments.
 * Version:           1.0.0
 * Author:            iamtanzir
 * License:           MIT
 * Text Domain:       free-payment-gateways
 * Requires PHP:      7.0
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // No direct access.
}

define( 'FPG_VERSION', '1.0.0' );
define( 'FPG_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );

require_once FPG_PLUGIN_DIR . 'includes/class-fpg-api.php';
require_once FPG_PLUGIN_DIR . 'includes/class-fpg-return-handler.php';
require_once FPG_PLUGIN_DIR . 'includes/class-fpg-shortcode.php';

// WooCommerce gateway is loaded only when WooCommerce is present.
add_action( 'plugins_loaded', function () {
    if ( class_exists( 'WooCommerce' ) ) {
        require_once FPG_PLUGIN_DIR . 'includes/class-fpg-woocommerce-gateway.php';
        add_filter( 'woocommerce_payment_gateways', function ( $gateways ) {
            $gateways[] = 'FPG_WooCommerce_Gateway';
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
        <h2>WooCommerce</h2>
        <p>Once saved, a payment method called <strong>FPG Self-Hosted Gateway</strong> appears under <em>WooCommerce → Settings → Payments</em>.</p>
    </div>
    <?php
}
