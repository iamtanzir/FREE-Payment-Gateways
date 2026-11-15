<?php
/**
 * WooCommerce payment gateway: "FPG Self-Hosted Gateway".
 * Redirects the customer to the hosted checkout page on the self-hosted gateway.
 * Order is marked paid when the customer returns and the invoice shows status=paid.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Only loaded when WooCommerce is present (see main plugin file), so no nested closures needed.
if ( ! class_exists( 'WC_Payment_Gateway' ) ) {
    return;
}

    class FPG_WooCommerce_Gateway extends WC_Payment_Gateway {

        public $form_fields = [];

        public function __construct() {
            $this->id                 = 'fpg_gateway';
            $this->method_title       = __( 'FPG Self-Hosted Gateway', 'free-payment-gateways' );
            $this->method_description = __( 'Zero monthly fees. Hosted checkout on your own server — Bangla QR / bKash / Nagad / Rocket / Bank (manual verify), bKash Tokenized, Stripe, Demo.', 'free-payment-gateways' );
            $this->icon               = '';
            $this->has_fields         = false;
            $this->supports           = [ 'products' ];

            $this->init_form_fields();
            $this->init_settings();

            $this->title       = $this->get_option( 'title', __( 'Pay via Bangla QR / bKash / Nagad / Rocket', 'free-payment-gateways' ) );
            $this->description = $this->get_option( 'description', __( 'You will be redirected to a secure checkout page to complete your payment.', 'free-payment-gateways' ) );
            $this->enabled     = $this->get_option( 'enabled', 'no' );

            add_action( 'woocommerce_update_options_payment_gateways_' . $this->id, [ $this, 'process_admin_options' ] );
        }

        public function init_form_fields() {
            $this->form_fields = [
                'enabled'     => [
                    'title'   => __( 'Enable/Disable', 'free-payment-gateways' ),
                    'type'    => 'checkbox',
                    'label'   => __( 'Enable FPG Self-Hosted Gateway', 'free-payment-gateways' ),
                    'default' => 'no',
                ],
                'title'       => [
                    'title'       => __( 'Title', 'free-payment-gateways' ),
                    'type'        => 'text',
                    'description' => __( 'Shown to customers at checkout.', 'free-payment-gateways' ),
                    'default'     => __( 'Pay via Bangla QR / bKash / Nagad / Rocket', 'free-payment-gateways' ),
                    'desc_tip'    => true,
                ],
                'description' => [
                    'title'   => __( 'Description', 'free-payment-gateways' ),
                    'type'    => 'textarea',
                    'default' => __( 'You will be redirected to a secure checkout page to complete your payment.', 'free-payment-gateways' ),
                ],
            ];
        }

        public function process_payment( $order_id ) {
            $order = wc_get_order( $order_id );
            if ( ! $order ) {
                wc_add_notice( __( 'Order not found.', 'free-payment-gateways' ), 'error' );
                return [ 'result' => 'failure' ];
            }

            $return_url = add_query_arg(
                [
                    'fpg_return' => '1',
                    'order_id'   => $order->get_id(),
                    'order_key'  => $order->get_order_key(),
                ],
                home_url( '/' )
            );

            $checkout = FPG_API::create_checkout( [
                'amount'         => $order->get_total(),
                'currency'       => $order->get_currency(),
                'description'    => sprintf( 'Order #%s — %s', $order->get_order_number(), get_bloginfo( 'name' ) ),
                'customer_name'  => trim( $order->get_billing_first_name() . ' ' . $order->get_billing_last_name() ),
                'customer_email' => $order->get_billing_email(),
                'customer_phone' => $order->get_billing_phone(),
                'success_url'    => $return_url,
                'cancel_url'     => $return_url,
                'metadata'       => [ 'order_id' => $order->get_id(), 'site' => home_url() ],
            ] );

            if ( is_wp_error( $checkout ) || empty( $checkout['checkout_url'] ) ) {
                $message = is_wp_error( $checkout ) ? $checkout->get_error_message() : __( 'Gateway did not return a checkout URL.', 'free-payment-gateways' );
                wc_add_notice( sprintf( __( 'Payment could not be started: %s', 'free-payment-gateways' ), $message ), 'error' );
                return [ 'result' => 'failure' ];
            }

            $order->update_meta_data( '_fpg_invoice_id', $checkout['id'] );
            $order->update_status( 'on-hold', sprintf( 'Awaiting FPG payment (invoice %s).', $checkout['id'] ) );
            $order->save();

            return [
                'result'   => 'success',
                'redirect' => $checkout['checkout_url'],
            ];
        }
    }
