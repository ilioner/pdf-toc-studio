#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

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

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![run_python_bridge])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
