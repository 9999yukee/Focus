use serde::{Deserialize, Serialize};
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct HiddenItem {
    pub id: String,
    pub label: String,
    pub kind: HiddenKind,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum HiddenKind {
    Server,
    Conversation,
    Friend,
}

#[derive(Clone, Copy, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    #[default]
    Black,
    Gray,
    White,
}

#[derive(Clone, Copy, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Density {
    #[default]
    Compact,
    Comfortable,
}

#[derive(Clone, Copy, Debug, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum BackgroundMode {
    #[default]
    Minimum,
    Balanced,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", default, deny_unknown_fields)]
pub struct Settings {
    pub version: u32,
    pub theme: Theme,
    pub density: Density,
    pub reduce_motion: bool,
    pub show_avatars: bool,
    pub animated_avatars: bool,
    pub animated_emoji: bool,
    pub show_embeds: bool,
    pub show_stickers: bool,
    pub pause_offscreen_media: bool,
    pub autoplay_video: bool,
    pub background_mode: BackgroundMode,
    pub hide_promotions: bool,
    pub close_to_tray: bool,
    pub desktop_notifications: bool,
    pub hidden_servers: Vec<HiddenItem>,
    pub hidden_friends: Vec<HiddenItem>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            version: 1,
            theme: Theme::Black,
            density: Density::Compact,
            reduce_motion: true,
            show_avatars: true,
            animated_avatars: false,
            animated_emoji: false,
            show_embeds: true,
            show_stickers: true,
            pause_offscreen_media: true,
            autoplay_video: false,
            background_mode: BackgroundMode::Minimum,
            hide_promotions: true,
            close_to_tray: false,
            desktop_notifications: false,
            hidden_servers: vec![],
            hidden_friends: vec![],
        }
    }
}

pub fn valid_id(id: &str) -> bool {
    (17..=20).contains(&id.len()) && id.bytes().all(|b| b.is_ascii_digit())
}

impl HiddenItem {
    pub fn validate(&self) -> Result<(), String> {
        if !valid_id(&self.id)
            || self.label.chars().count() > 80
            || self.label.chars().any(char::is_control)
        {
            return Err(
                "Invalid hidden item. Use a Discord ID and a label of up to 80 characters.".into(),
            );
        }
        Ok(())
    }
}

impl Settings {
    pub fn validate(&self) -> Result<(), String> {
        if self.version != 1 {
            return Err("Unsupported settings version. Your file was left unchanged.".into());
        }
        for (items, servers) in [(&self.hidden_servers, true), (&self.hidden_friends, false)] {
            if items.len() > 500 {
                return Err("The local hidden-item limit is 500 per group.".into());
            }
            let mut seen = std::collections::HashSet::new();
            for item in items {
                item.validate()?;
                if (item.kind == HiddenKind::Server) != servers
                    || !seen.insert((&item.id, format!("{:?}", item.kind)))
                {
                    return Err("Invalid or duplicate hidden item.".into());
                }
            }
        }
        Ok(())
    }
}

pub struct SettingsStore {
    path: PathBuf,
    pub value: Settings,
}

impl SettingsStore {
    pub fn open(directory: &Path) -> Result<Self, String> {
        fs::create_dir_all(directory)
            .map_err(|_| "Could not create Focus's local settings folder.")?;
        let path = directory.join("settings.json");
        let value = if path.exists() {
            if fs::metadata(&path)
                .map_err(|_| "Could not read settings.")?
                .len()
                > 1_048_576
            {
                return Err(
                    "Settings exceed the 1 MiB limit. The original file was preserved.".into(),
                );
            }
            let content = fs::read(&path).map_err(|_| "Could not read local settings.")?;
            let value: Settings = serde_json::from_slice(&content)
                .map_err(|_| "Local settings are invalid. The original file was preserved.")?;
            value.validate()?;
            value
        } else {
            Settings::default()
        };
        Ok(Self { path, value })
    }

    pub fn save(&mut self, value: Settings) -> Result<(), String> {
        value.validate()?;
        let bytes = serde_json::to_vec_pretty(&value).map_err(|_| "Could not encode settings.")?;
        let temporary = self.path.with_extension("json.tmp");
        let mut file = fs::File::create(&temporary).map_err(|_| "Could not write settings.")?;
        file.write_all(&bytes)
            .and_then(|()| file.sync_all())
            .map_err(|_| "Could not save settings.")?;
        drop(file);
        fs::rename(&temporary, &self.path)
            .map_err(|_| "Could not commit settings. Previous settings are unchanged.")?;
        self.value = value;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn preferences_and_hidden_items_survive_reopen() {
        let dir = std::env::temp_dir().join(format!("focus-settings-test-{}", std::process::id()));
        let mut store = SettingsStore::open(&dir).unwrap();
        let mut settings = Settings {
            theme: Theme::White,
            ..Settings::default()
        };
        settings.hidden_servers.push(HiddenItem {
            id: "12345678901234567".into(),
            label: "Test server".into(),
            kind: HiddenKind::Server,
        });
        settings.hidden_friends.push(HiddenItem {
            id: "23456789012345678".into(),
            label: "Test friend".into(),
            kind: HiddenKind::Friend,
        });
        settings.hidden_friends.push(HiddenItem {
            id: "34567890123456789".into(),
            label: "Test DM".into(),
            kind: HiddenKind::Conversation,
        });
        store.save(settings.clone()).unwrap();
        assert_eq!(SettingsStore::open(&dir).unwrap().value, settings);
        let mut invalid = settings.clone();
        invalid.version = 99;
        assert!(store.save(invalid).is_err());
        assert_eq!(SettingsStore::open(&dir).unwrap().value, settings);
        fs::write(dir.join("settings.json"), "broken").unwrap();
        assert!(SettingsStore::open(&dir).is_err());
        assert_eq!(
            fs::read_to_string(dir.join("settings.json")).unwrap(),
            "broken"
        );
        fs::remove_dir_all(dir).unwrap();
    }
    #[test]
    fn identifiers_cannot_inject_script_or_selectors() {
        for id in [
            "12",
            "1234567890123456'",
            "../../settings",
            "12345678901234567\n",
        ] {
            assert!(!valid_id(id));
        }
        assert!(valid_id("12345678901234567890"));
    }
}
