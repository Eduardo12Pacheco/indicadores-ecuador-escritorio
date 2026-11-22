fn main() {
    tauri_build::build();

    // tauri-build embeds the application manifest (Common Controls v6) only into binaries.
    // Integration tests such as `tests/commands.rs` then load comctl32 v5 and fail on
    // Windows with STATUS_ENTRYPOINT_NOT_FOUND, so give every MSVC test binary the same
    // dependency. See tauri-build's WindowsAttributes docs and tauri-winres `compile_for_everything`.
    let is_windows_msvc = std::env::var("CARGO_CFG_TARGET_OS").is_ok_and(|os| os == "windows")
        && std::env::var("CARGO_CFG_TARGET_ENV").is_ok_and(|env| env == "msvc");
    if is_windows_msvc {
        println!("cargo:rustc-link-arg-tests=/MANIFEST:EMBED");
        println!(
            "cargo:rustc-link-arg-tests=/MANIFESTDEPENDENCY:type='win32' name='Microsoft.Windows.Common-Controls' version='6.0.0.0' processorArchitecture='*' publicKeyToken='6595b64144ccf1df' language='*'"
        );
    }
}
