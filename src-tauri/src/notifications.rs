use tauri::Webview;
use webview2_com::{
    CoTaskMemPWSTR, Microsoft::Web::WebView2::Win32::*, PermissionRequestedEventHandler,
};
use windows::core::{Interface, PWSTR};

fn permitted(enabled: bool, uri: &str) -> bool {
    enabled
        && tauri::Url::parse(uri)
            .map(|url| url.scheme() == "https" && url.host_str() == Some("discord.com"))
            .unwrap_or(false)
}

/// WebView2 has no default notification permission prompt. Explicit local consent is
/// applied for this session; notification content and delivery stay inside WebView2.
pub fn install(view: &Webview, enabled: bool) -> tauri::Result<()> {
    view.with_webview(move |platform| {
        let result = unsafe { add_handler(platform.controller().CoreWebView2(), enabled) };
        if result.is_err() {
            log::warn!("Desktop notification permission handler is unavailable.");
        }
    })
}

unsafe fn add_handler(
    view: windows::core::Result<ICoreWebView2>,
    enabled: bool,
) -> windows::core::Result<()> {
    let view = view?;
    let mut registration = 0_i64;
    view.add_PermissionRequested(
        &PermissionRequestedEventHandler::create(Box::new(move |_, args| {
            let Some(args) = args else {
                return Ok(());
            };
            let mut kind = COREWEBVIEW2_PERMISSION_KIND::default();
            args.PermissionKind(&mut kind)?;
            if kind != COREWEBVIEW2_PERMISSION_KIND_NOTIFICATIONS {
                return Ok(());
            }
            let mut uri = PWSTR::null();
            args.Uri(&mut uri)?;
            let uri = CoTaskMemPWSTR::from(uri).to_string();
            // No persistent browser override: the Focus preference is authoritative at next launch.
            if let Ok(options) = args.cast::<ICoreWebView2PermissionRequestedEventArgs3>() {
                options.SetSavesInProfile(false)?;
            }
            args.SetState(if permitted(enabled, &uri) {
                COREWEBVIEW2_PERMISSION_STATE_ALLOW
            } else {
                COREWEBVIEW2_PERMISSION_STATE_DENY
            })?;
            Ok(())
        })),
        &mut registration,
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn notifications_require_local_consent_and_exact_origin() {
        assert!(permitted(true, "https://discord.com/channels/@me"));
        for uri in [
            "http://discord.com/",
            "https://discord.com.attacker.test/",
            "https://discord.com@attacker.test/",
        ] {
            assert!(!permitted(true, uri));
        }
        assert!(!permitted(false, "https://discord.com/"));
    }
}
