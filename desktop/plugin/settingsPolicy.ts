// SPDX-License-Identifier: GPL-3.0-or-later
import { isCommercialKey } from './model';

export type SettingDecision = 'keep' | 'remove' | 'replace' | 'performance';
export interface SettingAssessment { decision: SettingDecision; reason: string; effect: string }
const replaced = new Set([
    'appearance_theme_category', 'appearance_theme_fieldset', 'appearance_same_as_device_theme',
    'appearance_dual_theme_selector', 'appearance_default_themes', 'appearance_dark_sidebar',
    'appearance_client_themes', 'appearance_sync_theme', 'sync_profile_themes',
    'appearance_guild_theme_default_preference', 'appearance_in_app_icon_category', 'appearance_in_app_icon',
    'appearance_message_group_spacing'
]);
const internalTools = new Set([
    'load_source_maps', 'build_overrides', 'dev_overrides', 'premium_type_override', 'survey_override',
    'action_triggered_survey_override', 'change_log_override', 'change_log_clear', 'force_canary_api',
    'ad_override', 'only_show_preview_app_collections', 'disable_app_collections_cache', 'discord_stats_popout',
    'enable_tabs_experience', 'logging', 'gateway_logs', 'overlay_rpc_logs', 'analytics_logs',
    'keyboard_mismatches', 'request_tracing', 'keep_popouts_open', 'quest_logging', 'design_tools',
    'css_debugging', 'layout_debugging', 'layout_debugging_horizontal_spacing', 'layout_debugging_vertical_spacing',
    'highlight_mana_components', 'highlight_mana_text', 'highlight_mana_text_overrides', 'highlight_void_components', 'axe_auditing'
]);

/** Decisions apply to UI nodes. They do not pretend that removing a control stops its feature. */
export function assessSetting(key: string): SettingAssessment {
    if (/data_usage|sponsored_content|privacy|consent|unsubscribe|billing|payment|subscription|purchased_gift|redeem|my_gifts/.test(key))
        return { decision: 'keep', reason: 'Contrôle des données, des achats ou des consentements.', effect: 'Réglage natif conservé avec ses actions.' };
    if (isCommercialKey(key) || /upsell|^gifting_badge|^poggermode|^notification_holiday_soundpack$|^sounds_holiday_notice$/.test(key))
        return { decision: 'remove', reason: 'Promotion ou personnalisation décorative hors du périmètre Focus.', effect: 'Composant absent du rendu ; aucun gain global chiffré.' };
    if (replaced.has(key))
        return { decision: 'replace', reason: 'Thèmes, icône et espacement gérés directement par Focus.', effect: 'Évite deux contrôles contradictoires pour la même interface.' };
    if (internalTools.has(key) || /^developer_options_|^experiments_|^developer_section$/.test(key))
        return { decision: 'remove', reason: 'Outils internes de développement du client.', effect: 'Entrée retirée ; les outils utiles de diagnostic restent accessibles.' };
    if (/^clips_|^overlay_|^hardware_acceleration$|^camera_background|^voice_noise|^voice_echo|^voice_automatic|^advanced_voice|^animate_|^reduced_motion$|^sync_reduced_motion$|^streaming_|^os_|^capture_performance|debug_logging|audio_recording|record_connection/.test(key))
        return { decision: 'performance', reason: 'Coût possible si la fonction est active ; utile selon le matériel et les usages.', effect: 'Contrôle conservé pour pouvoir désactiver ou ajuster la fonction. Aucun changement silencieux.' };
    if (/accessibility|font_scaling|zoom|saturation|contrast|desaturate|forced_colors|readability|tts_|screen_reader|image_descriptions/.test(key))
        return { decision: 'keep', reason: 'Lisibilité ou accessibilité.', effect: 'Le besoin utilisateur prime sur une économie supposée.' };
    return { decision: 'keep', reason: 'Fonction utilisateur ou structure de navigation nécessaire ; aucune nuisance démontrée.', effect: 'Rendu natif conservé dans la navigation Focus.' };
}

export function removeSetting(key: string, compact: boolean, hidePromotions: boolean): boolean {
    const decision = assessSetting(key).decision;
    if (decision === 'remove') return isCommercialKey(key) || /upsell/.test(key) ? hidePromotions : compact;
    return decision === 'replace' && compact;
}
