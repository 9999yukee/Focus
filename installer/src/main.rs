use std::{env, fs, io::Write, process::Command};

const PACKAGE: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/focus-package.zip"));

fn quote_powershell(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

fn main() {
    if let Err(error) = install() {
        eprintln!("Installation Focus impossible : {error}");
        std::process::exit(1);
    }
}

fn install() -> Result<(), Box<dyn std::error::Error>> {
    let extraction = env::temp_dir().join(format!("FocusInstaller\\{}", uuid()));
    fs::create_dir_all(&extraction)?;
    let archive = extraction.join("Focus.zip");
    fs::File::create(&archive)?.write_all(PACKAGE)?;

    let expand = format!(
        "Expand-Archive -LiteralPath {} -DestinationPath {} -Force",
        quote_powershell(&archive.to_string_lossy()),
        quote_powershell(&extraction.to_string_lossy())
    );
    let status = Command::new("powershell.exe")
        .args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            &expand,
        ])
        .status()?;
    if !status.success() {
        return Err("decompression du paquet echouee".into());
    }

    let script = extraction.join("Install-Focus.ps1");
    let status = Command::new("powershell.exe")
        .args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            &script.to_string_lossy(),
            "-PackagePath",
            &extraction.to_string_lossy(),
        ])
        .status()?;
    if !status.success() {
        return Err(format!("script d'installation echoue ({})", status).into());
    }
    fs::remove_dir_all(extraction)?;
    Ok(())
}

fn uuid() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos()
        .to_string()
}
