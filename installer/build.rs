use std::{env, fs, path::PathBuf};

fn main() {
    let package = env::var_os("FOCUS_PACKAGE").expect("FOCUS_PACKAGE is required");
    let output = PathBuf::from(env::var_os("OUT_DIR").unwrap()).join("focus-package.zip");
    fs::copy(package, output).expect("could not embed Focus package");
    println!("cargo:rerun-if-changed={}", PathBuf::from(env::var_os("FOCUS_PACKAGE").unwrap()).display());
    println!("cargo:rerun-if-env-changed=FOCUS_PACKAGE");
}
