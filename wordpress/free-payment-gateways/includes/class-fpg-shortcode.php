<?php
/**
 * Shortcode: [fpg_pay amount="500" description="Donation" currency="BDT" button="Donate ৳500"]
 * Renders a pay button that creates a hosted checkout session and redirects to it.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class FPG_Shortcode {

    public static function init() {
        add_shortcode( 'fpg_pay', [ __CLASS__, 'render' ] );
        add_action( 'admin_post_fpg_pay', [ __CLASS__, 'handle' ] );
        add_action( 'admin_post_nopriv_fpg_pay', [ __CLASS__, 'handle' ] );
    }

    public static function render( $atts ) {
        $atts = shortcode_atts( [
            'amount'      => '0',
            'description' => __( 'Payment', 'free-payment-gateways' ),
            'currency'    => 'BDT',
            'button'      => __( 'Pay now', 'free-payment-gateways' ),
        ], $atts, 'fpg_pay' );

        $amount = (float) $atts['amount'];
        if ( $amount <= 0 ) {
            return '<p class="fpg-error">' . esc_html__( 'fpg_pay: amount must be greater than 0.', 'free-payment-gateways' ) . '</p>';
        }

        ob_start();
        ?>
        <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="fpg-pay-form">
            <input type="hidden" name="action" value="fpg_pay">
            <?php wp_nonce_field( 'fpg_pay_action', 'fpg_pay_nonce' ); ?>
            <input type="hidden" name="amount" value="<?php echo esc_attr( $amount ); ?>">
            <input type="hidden" name="description" value="<?php echo esc_attr( $atts['description'] ); ?>">
            <input type="hidden" name="currency" value="<?php echo esc_attr( strtoupper( $atts['currency'] ) ); ?>">
            <button type="submit" class="button button-primary fpg-pay-button"><?php echo esc_html( $atts['button'] ); ?></button>
        </form>
        <?php
        return ob_get_clean();
    }

    public static function handle() {
        if ( ! isset( $_POST['fpg_pay_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['fpg_pay_nonce'] ) ), 'fpg_pay_action' ) ) {
            wp_die( esc_html__( 'Invalid request.', 'free-payment-gateways' ), 403 );
        }

        $amount      = (float) ( $_POST['amount'] ?? 0 );
        $description = sanitize_text_field( wp_unslash( $_POST['description'] ?? 'Payment' ) );
        $currency    = strtoupper( sanitize_text_field( wp_unslash( $_POST['currency'] ?? 'BDT' ) ) );

        if ( $amount <= 0 || ! preg_match( '/^[A-Z]{3}$/', $currency ) ) {
            wp_die( esc_html__( 'Invalid amount or currency.', 'free-payment-gateways' ), 400 );
        }

        $return_url = add_query_arg( 'fpg_return', '1', home_url( '/' ) );

        $checkout = FPG_API::create_checkout( [
            'amount'      => $amount,
            'currency'    => $currency,
            'description' => $description,
            'success_url' => $return_url,
            'cancel_url'  => $return_url,
            'metadata'    => [ 'site' => home_url(), 'origin' => 'shortcode' ],
        ] );

        if ( is_wp_error( $checkout ) || empty( $checkout['checkout_url'] ) ) {
            $message = is_wp_error( $checkout ) ? $checkout->get_error_message() : __( 'Gateway did not return a checkout URL.', 'free-payment-gateways' );
            wp_die( esc_html( sprintf( __( 'Payment could not be started: %s', 'free-payment-gateways' ), $message ) ), 502 );
        }

        wp_redirect( $checkout['checkout_url'], 302 );
        exit;
    }
}

FPG_Shortcode::init();
