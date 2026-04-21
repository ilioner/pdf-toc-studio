#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rfd::FileDialog;
use serde_json::Value;
use std::path::PathBuf;
use std::process::Command;

#[tauri::command]
fn run_python_bridge(payload_json: String) -> Result<Value, String> {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let project_root = manifest_dir
        .parent()
        .ok_or_else(|| "Unable to resolve project root".to_string())?;

    let bridge_path = project_root.join("core").join("bridge.py");

    let output = Command::new("python3")
        .arg("-m")
        .arg("core.bridge")
        .current_dir(project_root)
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .and_then(|mut child| {
            use std::io::Write;
            if let Some(stdin) = child.stdin.as_mut() {
                stdin.write_all(payload_json.as_bytes())?;
            }
            child.wait_with_output()
        })
        .map_err(|err| format!("Failed to run python bridge {:?}: {}", bridge_path, err))?;

    if !output.status.success() {
      let stderr = String::from_utf8_lossy(&output.stderr).to_string();
      let stdout = String::from_utf8_lossy(&output.stdout).to_string();
      return Err(format!("Bridge failed. stdout: {} stderr: {}", stdout, stderr));
    }

    serde_json::from_slice::<Value>(&output.stdout).map_err(|err| format!("Invalid JSON from bridge: {}", err))
}

#[tauri::command]
fn pick_file(file_type_name: Option<String>, extensions: Option<Vec<String>>) -> Result<Option<String>, String> {
    let mut dialog = FileDialog::new();
    if let (Some(name), Some(exts)) = (file_type_name, extensions) {
        let ext_refs: Vec<&str> = exts.iter().map(String::as_str).collect();
        dialog = dialog.add_filter(&name, &ext_refs);
    }

    Ok(dialog
        .pick_file()
        .map(|path| path.to_string_lossy().to_string()))
}

#[tauri::command]
fn pick_folder() -> Result<Option<String>, String> {
    Ok(FileDialog::new()
        .pick_folder()
        .map(|path| path.to_string_lossy().to_string()))
}

#[tauri::command]
fn save_file(default_file_name: Option<String>) -> Result<Option<String>, String> {
    let mut dialog = FileDialog::new();
    if let Some(file_name) = default_file_name {
        dialog = dialog.set_file_name(&file_name);
    }

    Ok(dialog
        .save_file()
        .map(|path| path.to_string_lossy().to_string()))
}

#[tauri::command]
fn reveal_path(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    let mut command = {
        let mut cmd = Command::new("open");
        cmd.arg("-R").arg(path);
        cmd
    };

    #[cfg(target_os = "windows")]
    let mut command = {
        let mut cmd = Command::new("explorer");
        cmd.arg(path);
        cmd
    };

    #[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
    let mut command = {
        let mut cmd = Command::new("xdg-open");
        cmd.arg(path);
        cmd
    };

    command
        .spawn()
        .map(|_| ())
        .map_err(|err| format!("Failed to reveal path: {}", err))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            run_python_bridge,
            pick_file,
            pick_folder,
            save_file,
            reveal_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
