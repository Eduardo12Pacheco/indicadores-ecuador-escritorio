//! Typed application configuration resolved from environment variables (S17).
//!
//! The desktop shell deliberately resolves its data and log directories without
//! an `AppHandle`, because `--self-check` must run before any window exists.
//! The paths mirror Tauri's `app_data_dir`/`app_log_dir` for the bundle
//! identifier so both entry points share one store.

use std::path::{Component, Path, PathBuf};

/// Tauri bundle identifier (D27).
pub const BUNDLE_IDENTIFIER: &str = "io.github.eduardo12pacheco.ecuadorindicators";
/// Tauri product name, also used by the Linux and AppImage resource directory.
pub const PRODUCT_NAME: &str = "Ecuador Indicators";
/// Cargo binary name used by the Linux and AppImage resource directory fallback.
pub const BINARY_NAME: &str = "ecuador-indicators";
/// Candidate path of the bundled snapshot inside a source checkout.
pub const SOURCE_SNAPSHOT: &str = "data/snapshot/ecuador-indicators.snapshot.sqlite";
/// Candidate path of the bundled manifest inside a source checkout.
pub const SOURCE_MANIFEST: &str = "data/MANIFEST.json";
/// Snapshot resource name inside the bundled resource directory.
pub const RESOURCE_SNAPSHOT: &str = "data/ecuador-indicators.snapshot.sqlite";
/// Manifest resource name inside the bundled resource directory.
pub const RESOURCE_MANIFEST: &str = "data/MANIFEST.json";
/// Default release feed (D17).
pub const DEFAULT_UPDATE_URL: &str =
    "https://api.github.com/repos/Eduardo12Pacheco/indicadores-ecuador-escritorio/releases/latest";

/// Application settings needed before Tauri starts.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AppConfig {
    /// Directory holding `user.db` and other user data.
    pub home_dir: PathBuf,
    /// Directory receiving the rolling structured log.
    pub log_dir: PathBuf,
    /// Explicit snapshot path from `ECUADOR_INDICATORS_SNAPSHOT`.
    pub snapshot_override: Option<PathBuf>,
    /// GitHub "latest release" endpoint.
    pub update_url: String,
    /// Tracing filter/level from `ECUADOR_INDICATORS_LOG`.
    pub log_level: String,
}

fn env_path(key: &str) -> Option<PathBuf> {
    std::env::var_os(key)
        .map(PathBuf::from)
        .filter(|path| !path.as_os_str().is_empty())
}

fn home_dir() -> PathBuf {
    env_path("HOME")
        .or_else(|| env_path("USERPROFILE"))
        .unwrap_or_else(|| PathBuf::from("."))
}

/// `dirs::data_dir()` equivalent for the three supported operating systems.
fn data_root() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        env_path("APPDATA").unwrap_or_else(|| home_dir().join("AppData/Roaming"))
    }
    #[cfg(target_os = "macos")]
    {
        home_dir().join("Library/Application Support")
    }
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        env_path("XDG_DATA_HOME").unwrap_or_else(|| home_dir().join(".local/share"))
    }
}

/// `dirs::data_local_dir()` equivalent for the three supported operating systems.
fn local_data_root() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        env_path("LOCALAPPDATA").unwrap_or_else(|| home_dir().join("AppData/Local"))
    }
    #[cfg(target_os = "macos")]
    {
        home_dir().join("Library/Application Support")
    }
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        env_path("XDG_DATA_HOME").unwrap_or_else(|| home_dir().join(".local/share"))
    }
}

fn log_root() -> PathBuf {
    #[cfg(target_os = "macos")]
    {
        home_dir().join("Library/Logs")
    }
    #[cfg(not(target_os = "macos"))]
    {
        local_data_root()
    }
}

/// Candidate locations for a bundled resource relative to the executable.
///
/// Tauri places Windows resources next to the executable, macOS resources in
/// `Contents/Resources`, and Linux/AppImage resources in
/// `/usr/lib/<product>/data` while the executable lives in `/usr/bin`. The
/// Linux layouts are the reason this is not just `exe_dir.join(resource)`.
fn bundled_resource_candidates(executable_dir: &Path, resource: &str) -> Vec<PathBuf> {
    [
        executable_dir.join(resource),
        executable_dir.join("../Resources").join(resource),
        executable_dir
            .join("../lib")
            .join(PRODUCT_NAME)
            .join(resource),
        executable_dir
            .join("../lib")
            .join(BINARY_NAME)
            .join(resource),
    ]
    .into_iter()
    .map(normalize)
    .collect()
}

/// Resolves `..` lexically so candidate paths are comparable and readable.
fn normalize(path: PathBuf) -> PathBuf {
    let mut normalized = PathBuf::new();
    for component in path.components() {
        match component {
            Component::ParentDir => {
                normalized.pop();
            }
            Component::CurDir => {}
            other => normalized.push(other.as_os_str()),
        }
    }
    normalized
}

impl AppConfig {
    /// Resolves the documented environment variables with deterministic defaults.
    #[must_use]
    pub fn from_env() -> Self {
        let home_dir = env_path("ECUADOR_INDICATORS_HOME")
            .unwrap_or_else(|| data_root().join(BUNDLE_IDENTIFIER));
        let log_level = std::env::var("ECUADOR_INDICATORS_LOG")
            .ok()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| "info".to_string());
        let update_url = std::env::var("ECUADOR_INDICATORS_UPDATE_URL")
            .ok()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| DEFAULT_UPDATE_URL.to_string());
        Self {
            log_dir: log_root().join(BUNDLE_IDENTIFIER),
            home_dir,
            snapshot_override: env_path("ECUADOR_INDICATORS_SNAPSHOT"),
            update_url,
            log_level,
        }
    }

    /// Candidate locations for the bundled snapshot, most specific first.
    #[must_use]
    pub fn snapshot_candidates(&self) -> Vec<PathBuf> {
        let mut candidates = Vec::new();
        if let Some(explicit) = &self.snapshot_override {
            candidates.push(explicit.clone());
            return candidates;
        }
        candidates.push(PathBuf::from(SOURCE_SNAPSHOT));
        if let Some(executable) = std::env::current_exe()
            .ok()
            .and_then(|path| path.parent().map(Path::to_path_buf))
        {
            candidates.extend(bundled_resource_candidates(&executable, RESOURCE_SNAPSHOT));
            candidates.push(executable.join("../..").join(SOURCE_SNAPSHOT));
        }
        candidates
    }

    /// Candidate locations for the bundled manifest, most specific first.
    #[must_use]
    pub fn manifest_candidates(&self) -> Vec<PathBuf> {
        let mut candidates = vec![PathBuf::from(SOURCE_MANIFEST)];
        if let Some(executable) = std::env::current_exe()
            .ok()
            .and_then(|path| path.parent().map(Path::to_path_buf))
        {
            candidates.extend(bundled_resource_candidates(&executable, RESOURCE_MANIFEST));
            candidates.push(executable.join("../..").join(SOURCE_MANIFEST));
        }
        candidates
    }

    /// Resolves the snapshot used by the app and by `--self-check`.
    ///
    /// An explicit `ECUADOR_INDICATORS_SNAPSHOT` is authoritative even when the
    /// file is missing, so the failure names the user-provided path.
    #[must_use]
    pub fn resolve_snapshot(&self) -> PathBuf {
        let candidates = self.snapshot_candidates();
        candidates
            .iter()
            .find(|path| path.is_file())
            .or_else(|| candidates.first())
            .cloned()
            .unwrap_or_else(|| PathBuf::from(SOURCE_SNAPSHOT))
    }

    /// Resolves the manifest used to verify the snapshot file hash.
    #[must_use]
    pub fn resolve_manifest(&self) -> Option<PathBuf> {
        self.manifest_candidates()
            .into_iter()
            .find(|path| path.is_file())
    }
}

#[cfg(test)]
mod tests {
    use super::AppConfig;
    use std::path::PathBuf;

    fn config(override_path: Option<PathBuf>) -> AppConfig {
        AppConfig {
            home_dir: PathBuf::from("/tmp/home"),
            log_dir: PathBuf::from("/tmp/home/logs"),
            snapshot_override: override_path,
            update_url: "http://127.0.0.1:9/feed".to_string(),
            log_level: "info".to_string(),
        }
    }

    #[test]
    fn an_explicit_snapshot_override_is_authoritative() {
        let explicit = PathBuf::from("/tmp/custom.sqlite");
        let resolved = config(Some(explicit.clone())).resolve_snapshot();
        assert_eq!(resolved, explicit);
    }

    #[test]
    fn without_an_override_the_repository_snapshot_is_preferred_when_present() {
        let resolved = config(None).resolve_snapshot();
        assert_eq!(resolved, PathBuf::from(super::SOURCE_SNAPSHOT));
    }

    #[test]
    fn linux_package_resources_are_found_under_usr_lib() {
        let root = tempfile::tempdir().expect("tempdir");
        let executable_dir = root.path().join("usr/bin");
        let resource_dir = root.path().join("usr/lib/Ecuador Indicators/data");
        std::fs::create_dir_all(&executable_dir).expect("bin dir");
        std::fs::create_dir_all(&resource_dir).expect("resource dir");
        let snapshot = resource_dir.join("ecuador-indicators.snapshot.sqlite");
        let manifest = resource_dir.join("MANIFEST.json");
        std::fs::write(&snapshot, b"snapshot").expect("snapshot fixture");
        std::fs::write(&manifest, b"{}").expect("manifest fixture");

        let snapshot_candidates =
            super::bundled_resource_candidates(&executable_dir, super::RESOURCE_SNAPSHOT);
        assert!(
            snapshot_candidates.contains(&snapshot),
            "snapshot not found in {snapshot_candidates:?}"
        );

        let manifest_candidates =
            super::bundled_resource_candidates(&executable_dir, super::RESOURCE_MANIFEST);
        assert!(
            manifest_candidates.contains(&manifest),
            "manifest not found in {manifest_candidates:?}"
        );
    }
}
