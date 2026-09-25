use crate::settings::BackgroundMode;
use serde::Serialize;

#[derive(Clone, Copy, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AppState {
    Focused,
    Unfocused,
    Minimized,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourcePolicy {
    pub state: AppState,
    pub pause_cosmetics: bool,
    pub pause_attachment_video: bool,
    pub preserve_realtime: bool,
    pub view_visible: bool,
}

pub struct ResourceManager {
    pub state: AppState,
    pub view_visible: bool,
    pub monitor: bool,
}

impl Default for ResourceManager {
    fn default() -> Self {
        Self {
            state: AppState::Focused,
            view_visible: true,
            monitor: false,
        }
    }
}

impl ResourceManager {
    pub fn transition(&mut self, focused: bool, minimized: bool) -> bool {
        let next = if minimized {
            AppState::Minimized
        } else if focused {
            AppState::Focused
        } else {
            AppState::Unfocused
        };
        let changed = self.state != next;
        self.state = next;
        changed
    }

    pub fn policy(&self, background: BackgroundMode) -> ResourcePolicy {
        ResourcePolicy {
            state: self.state,
            pause_cosmetics: !self.view_visible || self.state != AppState::Focused,
            pause_attachment_video: !self.view_visible
                || self.state == AppState::Minimized
                || (self.state == AppState::Unfocused && background == BackgroundMode::Minimum),
            // Never infer voice inactivity from DOM visibility. Never suspend the Discord WebView.
            preserve_realtime: true,
            view_visible: self.view_visible,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn minimize_restore_and_hidden_view_preserve_realtime() {
        let mut manager = ResourceManager::default();
        assert!(manager.transition(false, false));
        assert!(
            manager
                .policy(BackgroundMode::Minimum)
                .pause_attachment_video
        );
        assert!(
            !manager
                .policy(BackgroundMode::Balanced)
                .pause_attachment_video
        );
        assert!(manager.transition(true, true));
        assert_eq!(manager.state, AppState::Minimized);
        assert!(manager.policy(BackgroundMode::Balanced).preserve_realtime);
        assert!(!manager.transition(false, true));
        manager.transition(true, false);
        assert!(!manager.policy(BackgroundMode::Minimum).pause_cosmetics);
        manager.view_visible = false;
        assert!(manager.policy(BackgroundMode::Minimum).pause_cosmetics);
    }
}
