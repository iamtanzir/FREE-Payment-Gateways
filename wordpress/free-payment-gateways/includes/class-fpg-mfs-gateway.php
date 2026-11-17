<?php
/**
 * FPG Bangla QR & MFS (Manual Verify) — an original, AGPL-licensed WooCommerce gateway.
 *
 * Customers pay through bKash / Nagad / Rocket / Upay / Bangla QR by scanning a QR code
 * or sending to the merchant's number, then enter their transaction ID at checkout.
 * The merchant reviews and approves the payment from the order screen.
 *
 * No API fees, no monthly cost — uses the merchant's own MFS wallet / bank QR.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Only loaded when WooCommerce is present (see main plugin file), so no nested closures needed.
if ( ! class_exists( 'WC_Payment_Gateway' ) ) {
    return;
}

    class FPG_MFS_Gateway extends WC_Payment_Gateway {

        const METHODS = [ 'bkash', 'nagad', 'rocket', 'upay', 'banglaqr' ];

        public $form_fields = [];
        public $instructions = '';

        public function __construct() {
            $this->id                 = 'fpg_mfs';
            $this->icon               = '';
            $this->has_fields         = true;
            $this->method_title       = __( 'FPG Bangla QR & MFS (Manual Verify)', 'free-payment-gateways' );
            $this->method_description = __( 'Free gateway: customers pay via Bangla QR or bKash/Nagad/Rocket/Upay to your own number/QR and enter their TrxID. You approve each payment manually from the order screen.', 'free-payment-gateways' );
            $this->supports           = [ 'products' ];

            $this->init_form_fields();
            $this->init_settings();

            $this->title        = $this->get_option( 'title', __( 'Bangla QR / bKash / Nagad / Rocket / Upay', 'free-payment-gateways' ) );
            $this->description  = $this->get_option( 'description', __( 'Pay with Bangla QR or any Bangladeshi MFS app. Enter your transaction ID after paying.', 'free-payment-gateways' ) );
            $this->instructions = $this->get_option( 'instructions', __( 'Your payment is on hold until we verify the transaction ID.', 'free-payment-gateways' ) );
            $this->enabled      = $this->get_option( 'enabled', 'no' );

            add_action( 'woocommerce_update_options_payment_gateways_' . $this->id, [ $this, 'process_admin_options' ] );
            add_action( 'woocommerce_thankyou_' . $this->id, [ $this, 'thankyou_page' ] );
        }

        public function init_form_fields() {
            $this->form_fields = [
                'enabled'      => [ 'title' => __( 'Enable/Disable', 'free-payment-gateways' ), 'type' => 'checkbox', 'label' => __( 'Enable FPG Bangla QR & MFS', 'free-payment-gateways' ), 'default' => 'no' ],
                'title'        => [ 'title' => __( 'Title', 'free-payment-gateways' ), 'type' => 'text', 'default' => __( 'Bangla QR / bKash / Nagad / Rocket / Upay', 'free-payment-gateways' ) ],
                'description'  => [ 'title' => __( 'Description', 'free-payment-gateways' ), 'type' => 'textarea', 'default' => __( 'Pay with Bangla QR or a Bangladeshi MFS app. Enter your transaction ID after paying.', 'free-payment-gateways' ) ],
                'instructions' => [ 'title' => __( 'Customer instructions (thank-you page)', 'free-payment-gateways' ), 'type' => 'textarea', 'default' => __( 'Your payment is on hold until we verify the transaction ID.', 'free-payment-gateways' ) ],
            ];

            foreach ( [
                'bkash'    => 'bKash',
                'nagad'    => 'Nagad',
                'rocket'   => 'Rocket',
                'upay'     => 'Upay',
                'banglaqr' => 'Bangla QR',
            ] as $id => $label ) {
                $this->form_fields[ $id . '_enabled' ] = [
                    'title'   => $label . ' — ' . __( 'Enabled', 'free-payment-gateways' ),
                    'type'    => 'checkbox',
                    'label'   => __( 'Show this method at checkout', 'free-payment-gateways' ),
                    'default' => 'yes',
                ];
                $this->form_fields[ $id . '_account' ] = [
                    'title'       => $label . ' — ' . __( 'Number / ID', 'free-payment-gateways' ),
                    'type'        => 'text',
                    'description' => __( 'Your bKash/Nagad/Rocket/Upay number, or a short label for the Bangla QR payer reference.', 'free-payment-gateways' ),
                    'default'     => '',
                ];
                $this->form_fields[ $id . '_qr' ] = [
                    'title'       => $label . ' — ' . __( 'QR image URL (optional)', 'free-payment-gateways' ),
                    'type'        => 'text',
                    'description' => __( 'HTTPS (or /path) URL of your QR image. Shown at checkout.', 'free-payment-gateways' ),
                    'default'     => '',
                ];
            }
        }

        private function method_label( $method ) {
            $labels = [ 'bkash' => 'bKash', 'nagad' => 'Nagad', 'rocket' => 'Rocket', 'upay' => 'Upay', 'banglaqr' => 'Bangla QR' ];
            return $labels[ $method ] ?? strtoupper( (string) $method );
        }

        private function method_enabled( $method ) {
            return 'yes' === $this->get_option( $method . '_enabled', 'yes' );
        }

        public function is_available() {
            if ( 'yes' !== $this->enabled ) {
                return false;
            }
            foreach ( self::METHODS as $method ) {
                if ( $this->method_enabled( $method ) ) {
                    return true;
                }
            }
            return false;
        }

        public function payment_fields() {
            $total = '';
            if ( WC()->cart ) {
                $total = wc_price( WC()->cart->get_total( 'edit' ) );
            }
            echo '<div class="fpg-mfs-fields" style="display:grid;gap:10px;max-width:420px">';
            if ( $total ) {
                echo '<p style="margin:0"><strong>' . esc_html__( 'Amount to pay:', 'free-payment-gateways' ) . ' ' . wp_kses_post( $total ) . '</strong></p>';
            }
            echo '<label for="fpg_mfs_method"><strong>' . esc_html__( 'Payment method', 'free-payment-gateways' ) . '</strong></label>';
            echo '<select id="fpg_mfs_method" name="fpg_mfs_method" style="padding:8px;border-radius:6px">';
            foreach ( self::METHODS as $method ) {
                if ( ! $this->method_enabled( $method ) ) {
                    continue;
                }
                echo '<option value="' . esc_attr( $method ) . '">' . esc_html( $this->method_label( $method ) ) . '</option>';
            }
            echo '</select>';

            foreach ( self::METHODS as $method ) {
                if ( ! $this->method_enabled( $method ) ) {
                    continue;
                }
                $qr      = trim( (string) $this->get_option( $method . '_qr', '' ) );
                $account = trim( (string) $this->get_option( $method . '_account', '' ) );
                echo '<div data-fpg-method="' . esc_attr( $method ) . '" class="fpg-mfs-panel" style="display:none;border:1px solid #ddd;border-radius:8px;padding:10px">';
                if ( $qr ) {
                    echo '<img src="' . esc_url( $qr ) . '" alt="' . esc_attr( $this->method_label( $method ) ) . ' QR" style="max-width:180px;display:block;margin:0 auto 8px;border-radius:8px">';
                }
                if ( $account ) {
                    echo '<p style="margin:4px 0"><strong>' . esc_html( $this->method_label( $method ) ) . ':</strong> <code>' . esc_html( $account ) . '</code></p>';
                } else {
                    echo '<p style="margin:4px 0;color:#a00">' . esc_html__( 'Merchant has not configured this method yet.', 'free-payment-gateways' ) . '</p>';
                }
                echo '</div>';
            }
            echo '<script>(function(){var s=document.getElementById("fpg_mfs_method");function t(){document.querySelectorAll(".fpg-mfs-panel").forEach(function(p){p.style.display=(p.getAttribute("data-fpg-method")===s.value)?"block":"none";});}s.addEventListener("change",t);t();})();</script>';

            echo '<label for="fpg_mfs_sender"><strong>' . esc_html__( 'Your wallet number', 'free-payment-gateways' ) . '</strong></label>';
            echo '<input type="text" id="fpg_mfs_sender" name="fpg_mfs_sender" placeholder="01XXXXXXXXX" autocomplete="off" required style="padding:8px;border-radius:6px;border:1px solid #ddd">';
            echo '<label for="fpg_mfs_trx"><strong>' . esc_html__( 'Transaction ID (TrxID)', 'free-payment-gateways' ) . '</strong></label>';
            echo '<input type="text" id="fpg_mfs_trx" name="fpg_mfs_trx" placeholder="e.g. 9G7H2K4LMN" autocomplete="off" required style="padding:8px;border-radius:6px;border:1px solid #ddd">';
            if ( $this->description ) {
                echo '<p class="form-row-wide" style="margin:0">' . wp_kses_post( wpautop( $this->description ) ) . '</p>';
            }
            echo '</div>';
        }

        public function validate_fields() {
            $method = isset( $_POST['fpg_mfs_method'] ) ? sanitize_text_field( wp_unslash( $_POST['fpg_mfs_method'] ) ) : '';
            $sender = isset( $_POST['fpg_mfs_sender'] ) ? sanitize_text_field( wp_unslash( $_POST['fpg_mfs_sender'] ) ) : '';
            $trx    = isset( $_POST['fpg_mfs_trx'] ) ? strtoupper( sanitize_text_field( wp_unslash( $_POST['fpg_mfs_trx'] ) ) ) : '';

            if ( ! in_array( $method, self::METHODS, true ) || ! $this->method_enabled( $method ) ) {
                wc_add_notice( __( 'Please choose a valid payment method.', 'free-payment-gateways' ), 'error' );
                return false;
            }
            if ( strlen( $trx ) < 6 || strlen( $trx ) > 64 ) {
                wc_add_notice( __( 'Please enter a valid Transaction ID (TrxID).', 'free-payment-gateways' ), 'error' );
                return false;
            }
            if ( strlen( $sender ) < 5 || strlen( $sender ) > 30 ) {
                wc_add_notice( __( 'Please enter the wallet number you paid from.', 'free-payment-gateways' ), 'error' );
                return false;
            }
            return true;
        }

        public function process_payment( $order_id ) {
            $order = wc_get_order( $order_id );
            if ( ! $order ) {
                wc_add_notice( __( 'Order not found.', 'free-payment-gateways' ), 'error' );
                return [ 'result' => 'failure' ];
            }

            $method = isset( $_POST['fpg_mfs_method'] ) ? sanitize_text_field( wp_unslash( $_POST['fpg_mfs_method'] ) ) : '';
            $sender = isset( $_POST['fpg_mfs_sender'] ) ? sanitize_text_field( wp_unslash( $_POST['fpg_mfs_sender'] ) ) : '';
            $trx    = isset( $_POST['fpg_mfs_trx'] ) ? strtoupper( sanitize_text_field( wp_unslash( $_POST['fpg_mfs_trx'] ) ) ) : '';

            if ( ! in_array( $method, self::METHODS, true ) ) {
                wc_add_notice( __( 'Please choose a valid payment method.', 'free-payment-gateways' ), 'error' );
                return [ 'result' => 'failure' ];
            }

            $order->update_meta_data( '_fpg_mfs_method', $method );
            $order->update_meta_data( '_fpg_mfs_sender', $sender );
            $order->update_meta_data( '_fpg_mfs_trx', $trx );
            $order->update_status(
                'on-hold',
                sprintf(
                    'FPG %s payment — sender: %s, TrxID: %s. Awaiting manual verification.',
                    $this->method_label( $method ),
                    $sender,
                    $trx
                )
            );
            $order->save();

            if ( WC()->cart ) {
                WC()->cart->empty_cart();
            }

            return [
                'result'   => 'success',
                'redirect' => $this->get_return_url( $order ),
            ];
        }

        public function thankyou_page( $order_id ) {
            $order = wc_get_order( $order_id );
            if ( $order ) {
                $trx = $order->get_meta( '_fpg_mfs_trx' );
                if ( $trx ) {
                    echo '<p>' . esc_html( sprintf( __( 'Your TrxID %s was received and is awaiting verification. We will complete your order once the payment is verified in our app.', 'free-payment-gateways' ), $trx ) ) . '</p>';
                }
            }
            if ( $this->instructions ) {
                echo wp_kses_post( wpautop( $this->instructions ) );
            }
        }
    }
