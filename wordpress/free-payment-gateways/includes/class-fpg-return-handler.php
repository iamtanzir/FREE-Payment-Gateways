<?php
/**
 * Handles the browser redirect back from the hosted checkout page.
 *
 * Flow:
 *   Gateway success_url → https://site/?fpg_return=1&order_id=123&order_key=wc_order_xxx
 *   → verify order key → ask gateway for invoice status → mark order paid → redirect to order-received page.
 *
 * Without order_id/order_key (plain shortcode payments) it simply shows a status page.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class FPG_Return_Handler {

    public static function init() {
        add_action( 'template_redirect', [ __CLASS__, 'maybe_handle' ] );
    }

    public static function maybe_handle() {
        if ( ! isset( $_GET['fpg_return'] ) ) {
            return;
        }

        $order_id  = isset( $_GET['order_id'] ) ? absint( $_GET['order_id'] ) : 0;
        $order_key = isset( $_GET['order_key'] ) ? sanitize_text_field( wp_unslash( $_GET['order_key'] ) ) : '';
        $invoice   = isset( $_GET['fpg_payment_id'] ) ? sanitize_text_field( wp_unslash( $_GET['fpg_payment_id'] ) ) : '';

        // WooCommerce order verification path.
        if ( $order_id && $order_key && function_exists( 'wc_get_order' ) ) {
            $order = wc_get_order( $order_id );
            if ( ! $order || $order->get_order_key() !== $order_key ) {
                wp_die( esc_html__( 'Invalid order reference.', 'free-payment-gateways' ), 403 );
            }
            $invoice_id = $order->get_meta( '_fpg_invoice_id' );
            if ( ! $invoice_id ) {
                $invoice_id = $invoice;
            }
            if ( $invoice_id ) {
                $status = FPG_API::get_invoice( $invoice_id );
                if ( ! is_wp_error( $status ) && isset( $status['status'] ) && 'paid' === $status['status'] ) {
                    if ( ! $order->is_paid() ) {
                        $order->payment_complete();
                        $order->add_order_note( sprintf( 'Paid via FREE-Payment-Gateways invoice %s.', $invoice_id ) );
                    }
                    wp_safe_redirect( $order->get_checkout_order_received_url() );
                    exit;
                }
                if ( ! is_wp_error( $status ) && isset( $status['status'] ) && in_array( $status['status'], [ 'failed', 'cancelled' ], true ) ) {
                    $order->update_status( 'cancelled', 'Payment cancelled or failed at the gateway.' );
                }
            }
            wc_add_notice( __( 'Your payment is being verified. You will receive an update once it is confirmed.', 'free-payment-gateways' ), 'notice' );
            wp_safe_redirect( wc_get_checkout_url() );
            exit;
        }

        // Standalone status page (shortcode payments).
        status_header( 200 );
        nocache_headers();
        $message = __( 'Your payment is being verified by the merchant. You can close this page.', 'free-payment-gateways' );
        if ( $invoice ) {
            $status = FPG_API::get_invoice( $invoice );
            if ( ! is_wp_error( $status ) && isset( $status['status'] ) ) {
                if ( 'paid' === $status['status'] ) {
                    $message = __( '✅ Payment received. Thank you!', 'free-payment-gateways' );
                } elseif ( in_array( $status['status'], [ 'failed', 'cancelled' ], true ) ) {
                    $message = __( '❌ Payment failed or was cancelled.', 'free-payment-gateways' );
                }
            }
        }
        $title = esc_html__( 'Payment status', 'free-payment-gateways' );
        wp_die( esc_html( $message ), $title, [ 'response' => 200 ] );
    }
}

FPG_Return_Handler::init();
