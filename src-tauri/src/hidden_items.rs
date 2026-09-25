use crate::settings::{HiddenItem, HiddenKind, Settings};

pub fn hide(settings: &mut Settings, item: HiddenItem) -> Result<(), String> {
    item.validate()?;
    let list = if item.kind == HiddenKind::Server {
        &mut settings.hidden_servers
    } else {
        &mut settings.hidden_friends
    };
    if !list
        .iter()
        .any(|entry| entry.id == item.id && entry.kind == item.kind)
    {
        if list.len() >= 500 {
            return Err("Hidden-item limit reached.".into());
        }
        list.push(item);
    }
    Ok(())
}

pub fn restore(settings: &mut Settings, id: &str, kind: HiddenKind) {
    let list = if kind == HiddenKind::Server {
        &mut settings.hidden_servers
    } else {
        &mut settings.hidden_friends
    };
    list.retain(|item| item.id != id || item.kind != kind);
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn hide_is_idempotent_and_restore_is_local() {
        let mut settings = Settings::default();
        let item = HiddenItem {
            id: "12345678901234567".into(),
            label: "Server".into(),
            kind: HiddenKind::Server,
        };
        hide(&mut settings, item.clone()).unwrap();
        hide(&mut settings, item).unwrap();
        assert_eq!(settings.hidden_servers.len(), 1);
        restore(&mut settings, "12345678901234567", HiddenKind::Conversation);
        assert_eq!(settings.hidden_servers.len(), 1);
        restore(&mut settings, "12345678901234567", HiddenKind::Server);
        assert!(settings.hidden_servers.is_empty());
    }
}
