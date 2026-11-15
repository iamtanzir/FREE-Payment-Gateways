<?php
/**
 * Admin order screen integration:
 *  - shows the customer's MFS method / wallet number / TrxID on the order
 *  - adds "Approve payment" and "Reject payment" buttons (manage_woocommerce + nonce)
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class FPG_Admin_Orders {

    public static function init() {
        add_action( 'woocommerce_admin_order_data_after_billing_address', [ __CLASS__, 'render_metabox' ], 10, 1 );
        add_action( 'admin_post_fpg_mfs_approve', [ __CLASS__, 'approve' ] );
        add_action( 'admin_post_fpg_mfs_reject', [ __CLASS__, 'reject' ] );
    }

    public static function render_metabox( $order ) {
        $trx = $order->get_meta( '_fpg_mfs_trx' );
        if ( ! $trx ) {
            return;
        }
        $method = $order->get_meta( '_fpg_mfs_method' );
        $sender = $order->get_meta( '_fpg_mfs_sender' );
        $labels = [ 'bkash' => 'bKash', 'nagad' => 'Nagad', 'rocket' => 'Rocket', 'upay' => 'Upay', 'banglaqr' => 'Bangla QR' ];
        $method_label = isset( $labels[ $method ] ) ? $labels[ $method ] : strtoupper( (string) $method );

        $approve  = wp_nonce_url( admin_url( 'admin-post.php?action=fpg_mfs_approve&order_id=' . $order->get_id() ), 'fpg_mfs_decide_' . $order->get_id() );
        $reject   = wp_nonce_url( admin_url( 'admin-post.php?action=fpg_mfs_reject&order_id=' . $order->get_id() ), 'fpg_mfs_decide_' . $order->get_id() );
        ?>
        <div class="fpg-mfs-metabox" style="margin:12px 0;padding:12px;border:1px solid #e5e5e5;border-radius:8px;background:#f9f9f9">
            <h4 style="margin:0 0 8px">📱 FPG MFS payment — verification needed</h4>
            <p style="margin:4px 0"><strong>Method:</strong> <?php echo esc_html( $method_label ); ?></p>
            <p style="margin:4px 0"><strong>Sender:</strong> <code><?php echo esc_html( $sender ); ?></code></p>
            <p style="margin:4px 0"><strong>TrxID:</strong> <code style="font-size:14px"><?php echo esc_html( $trx ); ?></code></p>
            <?php if ( 'on-hold' === $order->get_status() ) : ?>
                <p style="margin:10px 0 0">
                    <a class="button button-primary" href="<?php echo esc_url( $approve ); ?>">✅ Approve &amp; complete order</a>
                    <a class="button" href="<?php echo esc_url( $reject ); ?>" style="color:#a00">✗ Reject (mark failed)</a>
                </p>
            <?php endif; ?>
        </div>
        <?php
    }

    public static function decide( $approve ) {
        if ( ! current_user_can( 'manage_woocommerce' ) ) {
            wp_die( esc_html__( 'Permission denied.', 'free-payment-gateways' ), 403 );
        }
        $order_id = isset( $_GET['order_id'] ) ? absint( $_GET['order_id'] ) : 0;
        check_admin_referer( 'fpg_mfs_decide_' . $order_id );

        $order = wc_get_order( $order_id );
        if ( ! $order ) {
            wp_die( esc_html__( 'Order not found.', 'free-payment-gateways' ), 404 );
        }

        if ( $approve ) {
            if ( ! $order->is_paid() ) {
                $order->payment_complete();
                $order->add_order_note( 'FPG MFS payment verified & approved by ' . wp_get_current_user()->user_login );
            }
        } else {
            if ( 'on-hold' === $order->get_status() || 'pending' === $order->get_status() ) {
                $order->update_status( 'failed', 'FPG MFS payment rejected — TrxID not verified.' );
            }
        }

        wp_safe_redirect( $order->get_edit_order_url() );
        exit;
    }

    public static function approve() { self::decide( true ); }
    public static function reject()  { self::decide( false ); }
}

FPG_Admin_Orders::init();
