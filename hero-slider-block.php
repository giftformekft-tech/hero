<?php
/**
 * Plugin Name: Hero Slider Block (Gutenberg)
 * Description: Hero banner slider Gutenberg blokk. v1.15.0 – Okos kontraszt, Rule-of-thirds mankó, Sablonok, Időzítés, LCP-boost.
 * Version: 1.15
 * Author: ChatGPT
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'HSB_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'HSB_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

add_action( 'init', function() {
    wp_register_style( 'hsb-style', HSB_PLUGIN_URL . 'style.css', array(), '1.15' );
    wp_register_script( 'hsb-front', HSB_PLUGIN_URL . 'front.js', array(), '1.15', true );

    wp_register_script(
        'hsb-block',
        HSB_PLUGIN_URL . 'index.js',
        array( 'wp-blocks', 'wp-element', 'wp-components', 'wp-block-editor', 'wp-i18n' ),
        '1.15',
        true
    );
    wp_register_style( 'hsb-editor', HSB_PLUGIN_URL . 'editor.css', array(), '1.15' );

    register_block_type( __DIR__, array(
        'style'           => 'hsb-style',
        'editor_style'    => 'hsb-editor',
        'editor_script'   => 'hsb-block',
        'script'          => 'hsb-front',
    ) );
});
