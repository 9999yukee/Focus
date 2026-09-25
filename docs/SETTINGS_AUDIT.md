# Audit des paramètres Discord dans Focus

Inventaire du 2026-09-23 : **478 identifiants** (options, catégories et navigation) relevés dans le [bundle public Discord](https://discord.com/assets/web.352b0482a8b3b388.js). Les expériences et la plateforme peuvent modifier les options réellement affichées. Les paramètres inconnus restent accessibles par défaut.

- Conservé : 335
- Retiré : 52
- Remplacé par Focus : 13
- À ajuster selon usage : 78

Le classement provient de **desktop/plugin/settingsPolicy.ts**, utilisé par la navigation réelle. Les sous-arbres retirés ne sont pas rendus. Il ne s'agit pas d'une mesure CPU/RAM : enlever un onglet ne désactive pas sa fonction en arrière-plan.

Les promotions, offres de thèmes, badges cadeaux décoratifs et modes fantaisie sont retirés. Les sélecteurs de thème et d'icône remplacés par Focus disparaissent pour éviter les réglages contradictoires.

Les fonctions potentiellement coûteuses gardent leur bouton de désactivation : capture Clips et capture automatique, overlay en jeu, effets de caméra, traitements audio, animations et partage d'écran. Elles restent accessibles dans Performances ou Audio et vidéo. L'accélération matérielle reste réglable : la désactiver peut augmenter la charge CPU. Aucun changement silencieux des réglages audio, de capture, de confidentialité ou de consentement.

Les achats déjà effectués, factures, abonnements et annulations, sécurité du compte, appareils, suppression du compte, blocage, protection contre le spam et accessibilité restent accessibles. Les choix de confidentialité concernant les quêtes sont conservés. Le mode développeur normal et les diagnostics utiles sont conservés ; les outils expérimentaux internes sont retirés de la navigation simplifiée.

La version actuelle retire aussi le montage des composants du bandeau de quête et du panneau En ligne. Elle place uniquement les cartes d'activité en cours dans le profil. Ces changements empêchent les effets de ces composants de démarrer ; ils ne désactivent pas tous les services internes de Discord.

| Identifiant natif | Décision |
| --- | --- |
| `profile_section` | Conservé |
| `profile_sidebar_item` | Conservé |
| `profile_sidebar_item_wysiwyg` | Conservé |
| `profile_panel` | Conservé |
| `profile_category` | Conservé |
| `profile_setting` | Conservé |
| `user_section` | Conservé |
| `account_sidebar_item` | Conservé |
| `account_panel` | Conservé |
| `account_info_category` | Conservé |
| `account_info_username_setting` | Conservé |
| `account_info_claim_account_setting` | Conservé |
| `account_info_email_setting` | Conservé |
| `account_info_phone_setting` | Conservé |
| `account_password_security_category` | Conservé |
| `account_change_password_setting` | Conservé |
| `account_mfa_nested_panel` | Conservé |
| `multi_factor_authentication` | Conservé |
| `security_keys_category` | Conservé |
| `security_keys_list` | Conservé |
| `authenticator_app_category` | Conservé |
| `authenticator_app_disable_button` | Conservé |
| `sms_auth_category` | Conservé |
| `sms_auth_disable_button` | Conservé |
| `backup_codes_category` | Conservé |
| `backup_codes_setting` | Conservé |
| `account_sessions_nested_panel` | Conservé |
| `sessions_panel` | Conservé |
| `sessions_sessions_category` | Conservé |
| `sessions_current_session_setting` | Conservé |
| `sessions_other_sessions_setting` | Conservé |
| `sessions_logout_all_sessions_setting` | Conservé |
| `account_standing_nested_panel` | Conservé |
| `account_standing_nested_category` | Conservé |
| `account_standing_panel` | Conservé |
| `account_standing_category` | Conservé |
| `account_standing_setting` | Conservé |
| `account_info_age_group_verify_setting` | Conservé |
| `account_info_age_group_edit_setting` | Conservé |
| `account_info_age_group_info_setting` | Conservé |
| `account_status_age_group_verify_setting` | Conservé |
| `account_status_age_group_edit_setting` | Conservé |
| `account_status_age_group_info_setting` | Conservé |
| `account_family_center_category` | Conservé |
| `account_family_center_nested_panel` | Conservé |
| `family_center_panel` | Conservé |
| `family_center_category` | Conservé |
| `family_center_setting` | Conservé |
| `account_removal_category` | Conservé |
| `account_disable_setting` | Conservé |
| `account_delete_setting` | Conservé |
| `messaging_permissions_sidebar_item` | Conservé |
| `messaging_permissions_panel` | Conservé |
| `content_filters_related_settings` | Conservé |
| `content_filters_appearance_navigator` | Conservé |
| `connected_games_related_settings` | Conservé |
| `connected_games_authorized_apps_navigator` | Conservé |
| `connected_games_unavailable` | Conservé |
| `content_category` | Conservé |
| `spam_filters_category` | Conservé |
| `permissions_category` | Conservé |
| `friend_requests_category` | Conservé |
| `restricted_users_category` | Conservé |
| `connected_games_category` | Conservé |
| `content_filters_setting` | Conservé |
| `dm_spam_setting` | Conservé |
| `dm_safety_alerts_setting` | Conservé |
| `age_restricted_dm_setting` | Conservé |
| `age_restricted_ios_setting` | Conservé |
| `permissions_guild_selector` | Conservé |
| `permissions_dms_setting` | Conservé |
| `permissions_message_requests_setting` | Conservé |
| `message_requests_notice_setting` | Conservé |
| `friend_requests_everyone_setting` | Conservé |
| `friend_requests_mutual_friends_setting` | Conservé |
| `friend_requests_mutual_guilds_setting` | Conservé |
| `blocked_users` | Conservé |
| `ignored_users` | Conservé |
| `allow_game_friend_dms_setting` | Conservé |
| `in_game_dms_setting` | Conservé |
| `friend_requests_notes_setting` | Conservé |
| `friend_requests_fieldset` | Conservé |
| `data_and_privacy_sidebar_item` | Conservé |
| `data_and_privacy_panel` | Conservé |
| `profile_privacy_category` | Conservé |
| `profile_privacy_setting` | Conservé |
| `notify_friends_on_profile_update_setting` | Conservé |
| `profile_privacy_related_settings` | Conservé |
| `profile_privacy_to_activity_privacy_navigator` | Conservé |
| `data_usage_category` | Conservé |
| `data_usage_statistics_setting` | Conservé |
| `data_usage_quests_setting` | Conservé |
| `data_usage_quests_3p_setting` | Conservé |
| `data_usage_personalization_setting` | Conservé |
| `data_usage_disclaimer_setting` | Conservé |
| `data_usage_activity_privacy_navigator` | Conservé |
| `data_usage_related_settings` | Conservé |
| `data_harvest_request_setting` | Conservé |
| `sponsored_content_category` | Conservé |
| `sponsored_content_quests_setting` | Conservé |
| `sponsored_content_quests_3p_setting` | Conservé |
| `manage_sponsored_content_topics_setting` | Conservé |
| `voice_security_category` | Conservé |
| `persistent_verification_codes_setting` | Conservé |
| `users_verified_keys_list_setting` | Conservé |
| `clips_allow_voice_recording_setting` | À ajuster selon usage |
| `notifications_sidebar_item` | Conservé |
| `notifications_panel` | Conservé |
| `notifications_overview_category` | Conservé |
| `notification_selection_field_set` | Conservé |
| `desktop_notifications` | Conservé |
| `go_live_notifications` | Conservé |
| `reaction_notifications` | Conservé |
| `friend_online_notifications` | Conservé |
| `profile_updates_notifications` | Conservé |
| `friend_anniversary_notifications` | Conservé |
| `server_trending_notifications` | Conservé |
| `upcoming_server_event_notifications` | Conservé |
| `experimental_unreads` | Conservé |
| `notifications_sounds_category` | Conservé |
| `notification_holiday_soundpack` | Retiré |
| `notification_sounds_list` | Conservé |
| `notifications_sounds_related_settings` | Conservé |
| `notifications_to_voice_and_video_sounds_navigator` | Conservé |
| `sounds_list_item_` | Conservé |
| `selected_channel_notifications` | Conservé |
| `disable_all_notification_sounds` | Conservé |
| `notifications_badges_category` | Conservé |
| `enable_unread_message_badge` | Conservé |
| `task_bar_flashing` | Conservé |
| `screen_downtime_reminder` | Conservé |
| `screen_downtime_schedule` | Conservé |
| `notifications_email_category` | Conservé |
| `email_list_item_` | Conservé |
| `unsubscribe_from_all_marketing_emails` | Conservé |
| `notifications_advanced_category` | Conservé |
| `notifications_advanced_accordion` | Conservé |
| `mobile_notification_delay` | Conservé |
| `text_to_speech_command` | Conservé |
| `text_to_speech_notifications` | Conservé |
| `clips_sidebar_item` | À ajuster selon usage |
| `clips_panel` | À ajuster selon usage |
| `clips_hardware_classification_warning` | À ajuster selon usage |
| `clips_quality_infobox` | À ajuster selon usage |
| `clips_enable` | À ajuster selon usage |
| `clips_enable_reminders` | À ajuster selon usage |
| `clips_show_pov_clips` | À ajuster selon usage |
| `clips_length` | À ajuster selon usage |
| `clips_resolution` | À ajuster selon usage |
| `clips_frame_rate` | À ajuster selon usage |
| `clips_bitrate` | À ajuster selon usage |
| `clips_keybind` | À ajuster selon usage |
| `clips_screenshot_keybind` | À ajuster selon usage |
| `clips_storage_location` | À ajuster selon usage |
| `clips_general_category` | À ajuster selon usage |
| `clips_general_card` | À ajuster selon usage |
| `clips_autoclipping_category` | À ajuster selon usage |
| `clips_autoclipping_card` | À ajuster selon usage |
| `clips_capture_settings_category` | À ajuster selon usage |
| `clips_storage_category` | À ajuster selon usage |
| `clips_enable_autoclipping` | À ajuster selon usage |
| `clips_developer_category` | À ajuster selon usage |
| `clips_debug_tooltips` | À ajuster selon usage |
| `billing_section` | Conservé |
| `nitro_sidebar_item` | Retiré |
| `nitro_panel` | Retiré |
| `nitro_category` | Retiré |
| `nitro_setting` | Retiré |
| `premium_guild_subscriptions_sidebar_item` | Conservé |
| `premium_guild_subscriptions_panel` | Conservé |
| `premium_guild_subscriptions_category` | Conservé |
| `premium_guild_subscriptions_setting` | Conservé |
| `subscriptions_sidebar_item` | Conservé |
| `subscriptions_panel` | Conservé |
| `subscriptions_category` | Conservé |
| `subscriptions_settings` | Conservé |
| `gift_sidebar_item` | Conservé |
| `gift_panel` | Conservé |
| `redeem_gift_category` | Conservé |
| `redeem_code_input` | Conservé |
| `my_gifts_category` | Conservé |
| `my_gifts_content` | Conservé |
| `purchased_gifts_category` | Conservé |
| `purchased_gifts_content` | Conservé |
| `gifting_badge_category` | Retiré |
| `gifting_badge_content` | Retiré |
| `gift_blocked_payments_setting` | Conservé |
| `gift_blocked_payments_category` | Conservé |
| `billing_sidebar_item` | Conservé |
| `billing_panel` | Conservé |
| `billing_payment_methods_category` | Conservé |
| `billing_payment_methods` | Conservé |
| `billing_transaction_history_category` | Conservé |
| `billing_transaction_history` | Conservé |
| `app_section` | Conservé |
| `appearance_sidebar_item` | Conservé |
| `appearance_panel` | Conservé |
| `appearance_theme_category` | Remplacé par Focus |
| `appearance_theme_fieldset` | Remplacé par Focus |
| `appearance_same_as_device_theme` | Remplacé par Focus |
| `appearance_dual_theme_selector` | Remplacé par Focus |
| `appearance_default_themes` | Remplacé par Focus |
| `appearance_dark_sidebar` | Remplacé par Focus |
| `appearance_custom_themes_upsell` | Retiré |
| `appearance_client_themes` | Remplacé par Focus |
| `appearance_sync_theme` | Remplacé par Focus |
| `sync_profile_themes` | Remplacé par Focus |
| `appearance_guild_theme_default_preference` | Remplacé par Focus |
| `appearance_theme_related_settings` | Conservé |
| `appearance_theme_accessibility_navigator` | Conservé |
| `appearance_in_app_icon_category` | Remplacé par Focus |
| `appearance_in_app_icon` | Remplacé par Focus |
| `appearance_messages_category` | Conservé |
| `chat_inline_media_field_set` | Conservé |
| `chat_inline_media_links` | Conservé |
| `chat_inline_media_uploads` | Conservé |
| `chat_embeds_render_embeds` | Conservé |
| `chat_emoji_render_reactions` | Conservé |
| `chat_spoilers_show_spoilers` | Conservé |
| `chat_threads_split_view` | Conservé |
| `appearance_display_compact_avatars` | Conservé |
| `chat_favorites_toggle` | Conservé |
| `appearance_chat_related_settings` | Conservé |
| `appearance_chat_accessibility_navigator` | Conservé |
| `appearance_chat_box_category` | Conservé |
| `chat_text_box_previews` | Conservé |
| `chat_emoji_convert_emoticons` | Conservé |
| `chat_stickers_autocomplete` | Conservé |
| `chat_game_mentions_autocomplete` | Conservé |
| `enable_send_button` | Conservé |
| `enable_send_button_outside_experiment` | Conservé |
| `enable_apps_button` | Conservé |
| `expression_picker_format` | Conservé |
| `condense_picker_when_narrow` | Conservé |
| `enable_emoji_button` | Conservé |
| `enable_gif_button` | Conservé |
| `enable_sticker_button` | Conservé |
| `chat_bar_advanced_accordion` | Conservé |
| `expression_picker_field_set` | Conservé |
| `appearance_search_category` | Conservé |
| `message_search_default_dm_search_behavior` | Conservé |
| `streamer_mode_category` | Conservé |
| `streaming_enable_streamer_mode` | À ajuster selon usage |
| `streaming_auto_streamer_mode` | À ajuster selon usage |
| `streamer_mode_options_list` | Conservé |
| `streamer_mode_hide_personal_information` | Conservé |
| `streamer_mode_hide_invite_links` | Conservé |
| `streamer_mode_disable_sounds` | Conservé |
| `streamer_mode_disable_notifications` | Conservé |
| `streamer_mode_hide_discord_window_from_screen_capture` | Conservé |
| `streamer_mode_hide_overlay_widgets` | Conservé |
| `appearance_advanced_category` | Conservé |
| `hardware_acceleration` | À ajuster selon usage |
| `show_game_library` | Conservé |
| `accessibility_sidebar_item` | Conservé |
| `accessibility_panel` | Conservé |
| `text_readability_category` | Conservé |
| `appearance_font_scaling` | Conservé |
| `underline_links` | Conservé |
| `display_name_styles` | Conservé |
| `visual_density_category` | Conservé |
| `appearance_ui_density` | Conservé |
| `appearance_message_display_mode` | Conservé |
| `appearance_message_group_spacing` | Remplacé par Focus |
| `appearance_zoom` | Conservé |
| `color_and_contrast_category` | Conservé |
| `saturation` | Conservé |
| `desaturate_custom_colors` | Conservé |
| `high_contrast_mode` | Conservé |
| `enable_custom_cursor` | Conservé |
| `sync_forced_colors` | Conservé |
| `high_dynamic_range` | Conservé |
| `role_style` | Conservé |
| `official_message_style` | Conservé |
| `enable_switch_icons` | Conservé |
| `color_and_contrast_related_settings` | Conservé |
| `accessibility_to_display_navigator` | Conservé |
| `motion` | Conservé |
| `reduced_motion` | À ajuster selon usage |
| `sync_reduced_motion` | À ajuster selon usage |
| `animate_gifs` | À ajuster selon usage |
| `animate_emojis` | À ajuster selon usage |
| `animate_stickers` | À ajuster selon usage |
| `audio_and_screen_reader_category` | Conservé |
| `tts_playback_rate` | Conservé |
| `chat_inline_media_image_descriptions` | Conservé |
| `enable_legacy_chat_input` | Conservé |
| `voice_and_video_sidebar_item` | Conservé |
| `voice_and_video_panel` | Conservé |
| `voice_category` | Conservé |
| `voice_input_output_device_split` | Conservé |
| `voice_microphone_input_select` | Conservé |
| `voice_speakers_output_select` | Conservé |
| `voice_input_output_volume_split` | Conservé |
| `voice_input_volume_setting` | Conservé |
| `voice_output_volume_setting` | Conservé |
| `voice_microphone_test_setting` | Conservé |
| `voice_input_profile_category` | Conservé |
| `voice_input_profile_setting` | Conservé |
| `voice_push_to_talk_setting` | Conservé |
| `voice_push_to_talk_keybind_setting` | Conservé |
| `voice_push_to_talk_release_delay_setting` | Conservé |
| `voice_noise_suppression_setting` | À ajuster selon usage |
| `input_profile_voice_advanced_accordion` | Conservé |
| `voice_input_sensitivity_field_set` | Conservé |
| `voice_echo_cancellation_setting` | À ajuster selon usage |
| `voice_spatial_audio_setting` | Conservé |
| `advanced_voice_activity_processing_setting` | À ajuster selon usage |
| `voice_automatic_gain_control_setting` | À ajuster selon usage |
| `voice_bypass_system_input_processing_setting` | Conservé |
| `voice_audio_device_suggestions_setting` | Conservé |
| `voice_silence_warning_setting` | Conservé |
| `voice_switch_channel_alert_setting` | Conservé |
| `voice_global_attenuation_field_set` | Conservé |
| `voice_global_attenuation_slider` | Conservé |
| `voice_global_attenuation_for_self_setting` | Conservé |
| `voice_global_attenuation_for_others_setting` | Conservé |
| `voice_audio_subsystem_setting` | Conservé |
| `voice_quality_of_service_setting` | Conservé |
| `camera_category` | Conservé |
| `camera_video_preview` | Conservé |
| `camera_preview_preference` | Conservé |
| `camera_selection_setting` | Conservé |
| `camera_background_setting` | À ajuster selon usage |
| `streaming_category` | À ajuster selon usage |
| `streaming_show_stream_previews` | À ajuster selon usage |
| `streaming_advanced_accordion` | À ajuster selon usage |
| `streaming_stream_attenuation` | À ajuster selon usage |
| `streaming_stream_attenuation_strength` | À ajuster selon usage |
| `streaming_os_menu_screen_capture` | À ajuster selon usage |
| `streaming_experimental_soundshare` | À ajuster selon usage |
| `streaming_advanced_screenshare` | À ajuster selon usage |
| `voice_and_video_diagnostics_category` | Conservé |
| `voice_and_video_diagnostics_accordion` | Conservé |
| `voice_and_video_stream_info_overlay` | Conservé |
| `voice_and_video_audio_recording` | À ajuster selon usage |
| `voice_and_video_record_connection_replay` | À ajuster selon usage |
| `voice_and_video_open_connection_replay` | Conservé |
| `voice_and_video_debug_logging` | À ajuster selon usage |
| `voice_and_video_openh264` | Conservé |
| `voice_and_video_reset_all_settings` | Conservé |
| `sounds_category` | Conservé |
| `voice_and_video_sounds_list` | Conservé |
| `sounds_holiday_notice` | Retiré |
| `voice_and_video_sounds_related_settings` | Conservé |
| `voice_and_video_to_notification_sounds_navigator` | Conservé |
| `soundboard_category` | Conservé |
| `soundboard_volume_setting` | Conservé |
| `soundmoji_volume_setting` | Conservé |
| `entrance_sounds_setting` | Conservé |
| `guild_rooms_category` | Conservé |
| `guild_rooms_remember_last_view_setting` | Conservé |
| `poggermode_sidebar_item` | Retiré |
| `poggermode_panel` | Retiré |
| `poggermode_category` | Retiré |
| `poggermode_setting` | Retiré |
| `system_sidebar_item` | Conservé |
| `system_panel` | Conservé |
| `system_general_category` | Conservé |
| `system_custom_keybinds_category` | Conservé |
| `custom_keybinds_setting` | Conservé |
| `system_default_keybinds_category` | Conservé |
| `default_keybinds_setting` | Conservé |
| `system_helper_category` | Conservé |
| `system_advanced_category` | Conservé |
| `os_open_on_startup` | À ajuster selon usage |
| `os_start_minimized` | À ajuster selon usage |
| `os_minimize_to_tray` | À ajuster selon usage |
| `os_system_service` | À ajuster selon usage |
| `capture_performance_trace` | À ajuster selon usage |
| `language_and_time_panel` | Conservé |
| `language_and_time_category` | Conservé |
| `language_and_time_sidebar_item` | Conservé |
| `language_select_setting` | Conservé |
| `time_format_setting` | Conservé |
| `games_and_apps_section` | Conservé |
| `connected_apps_sidebar_item` | Conservé |
| `connected_apps_panel` | Conservé |
| `connections_category` | Conservé |
| `authorized_apps_category` | Conservé |
| `authorized_apps_list_setting` | Conservé |
| `connections_add_connections_setting` | Conservé |
| `connections_connected_accounts_setting` | Conservé |
| `activity_privacy_sidebar_item` | Conservé |
| `activity_privacy_panel` | Conservé |
| `activity_sharing_category` | Conservé |
| `activity_sharing_per_guild_category` | Conservé |
| `activity_sharing_per_guild_default_setting` | Conservé |
| `activity_sharing_per_guild_setting` | Conservé |
| `activity_privacy_related_settings` | Conservé |
| `activity_privacy_to_profile_privacy_navigator` | Conservé |
| `activity_sharing_related_settings` | Conservé |
| `activity_privacy_to_registered_games_navigator` | Conservé |
| `activity_sharing_game_joining_category` | Conservé |
| `activity_privacy_game_joining_blurb` | Conservé |
| `activity_privacy_setting` | Conservé |
| `activity_privacy_friends_join_setting` | Conservé |
| `activity_privacy_voice_join_setting` | Conservé |
| `activity_privacy_notify_friends_online_setting` | Conservé |
| `registered_games_sidebar_item` | Conservé |
| `registered_games_panel` | Conservé |
| `registered_games_current_game_category` | Conservé |
| `registered_games_added_games_category` | Conservé |
| `registered_games_current_game_setting` | Conservé |
| `registered_games_added_games_setting` | Conservé |
| `registered_games_related_settings` | Conservé |
| `registered_games_to_activity_privacy_navigator` | Conservé |
| `overlay_sidebar_item` | À ajuster selon usage |
| `overlay_panel` | À ajuster selon usage |
| `overlay_enable_category` | À ajuster selon usage |
| `overlay_current_game` | À ajuster selon usage |
| `overlay_oop_setting` | À ajuster selon usage |
| `overlay_legacy_setting` | À ajuster selon usage |
| `overlay_bug_reporter_setting` | À ajuster selon usage |
| `overlay_general_category` | À ajuster selon usage |
| `overlay_keybind_setting` | À ajuster selon usage |
| `overlay_limited_interaction_override_setting` | À ajuster selon usage |
| `overlay_clickable_regions_setting` | À ajuster selon usage |
| `overlay_voice_widget_category` | À ajuster selon usage |
| `overlay_voice_widget_preview` | À ajuster selon usage |
| `overlay_voice_widget_avatar_size` | À ajuster selon usage |
| `overlay_voice_widget_display_names` | À ajuster selon usage |
| `overlay_voice_widget_display_users` | À ajuster selon usage |
| `overlay_voice_widget_max_users` | À ajuster selon usage |
| `overlay_notifications_category` | À ajuster selon usage |
| `overlay_notifications_list` | À ajuster selon usage |
| `overlay_notifications_text_chat` | À ajuster selon usage |
| `overlay_notifications_welcome` | À ajuster selon usage |
| `overlay_notifications_go_live` | À ajuster selon usage |
| `overlay_notifications_game_activity` | À ajuster selon usage |
| `overlay_notifications_now_playing` | À ajuster selon usage |
| `overlay_notifications_now_playing_different_games` | À ajuster selon usage |
| `developer_section` | Retiré |
| `experiments_sidebar_item` | Retiré |
| `experiments_panel` | Retiré |
| `experiments_category` | Retiré |
| `experiments_setting` | Retiré |
| `developer_options_sidebar_item` | Retiré |
| `developer_options_panel` | Retiré |
| `load_source_maps` | Retiré |
| `build_overrides` | Retiré |
| `dev_overrides` | Retiré |
| `premium_type_override` | Retiré |
| `survey_override` | Retiré |
| `action_triggered_survey_override` | Retiré |
| `change_log_override` | Retiré |
| `change_log_clear` | Retiré |
| `force_canary_api` | Retiré |
| `ad_override` | Retiré |
| `only_show_preview_app_collections` | Retiré |
| `disable_app_collections_cache` | Retiré |
| `discord_stats_popout` | Retiré |
| `enable_tabs_experience` | Retiré |
| `logging` | Retiré |
| `gateway_logs` | Retiré |
| `overlay_rpc_logs` | Retiré |
| `analytics_logs` | Retiré |
| `keyboard_mismatches` | Retiré |
| `request_tracing` | Retiré |
| `keep_popouts_open` | Retiré |
| `quest_logging` | Retiré |
| `design_tools` | Retiré |
| `css_debugging` | Retiré |
| `layout_debugging` | Retiré |
| `layout_debugging_horizontal_spacing` | Retiré |
| `layout_debugging_vertical_spacing` | Retiré |
| `highlight_mana_components` | Retiré |
| `highlight_mana_text` | Retiré |
| `highlight_mana_text_overrides` | Retiré |
| `highlight_void_components` | Retiré |
| `axe_auditing` | Retiré |
| `utility_section` | Conservé |
| `developer_sidebar_item` | Conservé |
| `developer_panel` | Conservé |
| `developer_category` | Conservé |
| `developer_mode` | Conservé |
| `application_test_mode` | Conservé |
| `logout_sidebar_item` | Conservé |
