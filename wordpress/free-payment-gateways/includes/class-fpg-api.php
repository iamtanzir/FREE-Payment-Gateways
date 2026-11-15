<?php
/**
 * Thin REST client for the self-hosted FREE-Payment-Gateways server.
 * Uses WordPress' built-in HTTP API — no external dependencies.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class FPG_API {

    public static function base_url() {
        return untrailingslashit( trim( get_option( 'fpg_base_url', '' ) ) );
    }

    public static function api_key() {
        return trim( get_option( 'fpg_api_key', '' ) );
    }

    public static function is_configured() {
        return self::base_url() !== '' && self::api_key() !== '';
    }

    /**
     * @param string $method   HTTP method.
     * @param string $path     Path starting with /api/... (or any gateway path).
     * @param array|null $body JSON body for POST requests.
     * @return array|WP_Error  Decoded JSON body on success.
     */
    public static function request( $method, $path, $body = null ) {
        if ( ! self::is_configured() ) {
            return new WP_Error( 'fpg_not_configured', __( 'FPG gateway: set Base URL and API key under Settings → FPG Gateway.', 'free-payment-gateways' ) );
        }

        $args = [
            'method'  => $method,
            'timeout' => 20,
            'headers' => [
                'Authorization' => 'Bearer ' . self::api_key(),
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ],
        ];
        if ( $body !== null ) {
            $args['body'] = wp_json_encode( $body );
        }

        $response = wp_remote_request( self::base_url() . $path, $args );
        if ( is_wp_error( $response ) ) {
            return $response;
        }
        $code = wp_remote_retrieve_response_code( $response );
        $data = json_decode( wp_remote_retrieve_body( $response ), true );
        if ( $code < 200 || $code >= 300 ) {
            $message = is_array( $data ) && ! empty( $data['error'] ) ? $data['error'] : ( 'HTTP ' . $code );
            return new WP_Error( 'fpg_http_' . $code, $message );
        }
        return is_array( $data ) ? $data : [];
    }

    /** Create a hosted checkout session. Returns decoded API response. */
    public static function create_checkout( $args ) {
        return self::request( 'POST', '/api/v1/checkout', $args );
    }

    /** Fetch an invoice. */
    public static function get_invoice( $invoice_id ) {
        return self::request( 'GET', '/api/v1/invoices/' . rawurlencode( $invoice_id ) );
    }
}
