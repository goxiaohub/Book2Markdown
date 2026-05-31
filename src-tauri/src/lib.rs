use std::process::Command;
use std::time::Duration;
use serde::{Deserialize, Serialize};
use serde_json::Value;

// ---- 桥接协议类型 ----

#[derive(Debug, Serialize, Deserialize)]
pub struct BridgeResponse {
    pub protocol: String,
    pub success: bool,
    pub data: Value,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConversionData {
    pub markdown: String,
    pub filename: String,
    #[serde(default)]
    pub metadata: Option<ConversionMetadata>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConversionMetadata {
    pub source_file: Option<String>,
    pub source_format: Option<String>,
    pub source_extension: Option<String>,
    pub source_size_bytes: Option<u64>,
    pub markdown_length: Option<usize>,
    pub conversion_time_seconds: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthData {
    pub status: String,
    pub engine: String,
    pub protocol: String,
    pub supported_formats_count: usize,
    pub supported_extensions: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportRequest {
    pub content: String,
    pub path: String,
    pub filename: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BatchExportRequest {
    pub files: Vec<ExportFileEntry>,
    pub output_dir: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportFileEntry {
    pub content: String,
    pub filename: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportResult {
    pub success: bool,
    pub file_path: String,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BatchExportResult {
    pub success: bool,
    pub results: Vec<ExportResult>,
    pub output_dir: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConversionResult {
    pub success: bool,
    pub markdown: String,
    pub error: Option<String>,
    pub filename: Option<String>,
    pub metadata: Option<ConversionMetadata>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HealthResult {
    pub available: bool,
    pub engine: Option<String>,
    pub version: Option<String>,
    pub error: Option<String>,
}

// ---- Python 路径解析 ----

fn find_python() -> String {
    for cmd in &["python", "python3", "python3.12", "python3.14"] {
        if Command::new(cmd).arg("--version").output().is_ok() {
            return cmd.to_string();
        }
    }
    "python".to_string()
}

fn backend_dir() -> std::path::PathBuf {
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let candidate = dir.join("backend");
            if candidate.exists() {
                return candidate;
            }
            let resources = dir.join("../Resources/backend");
            if resources.exists() {
                return resources;
            }
        }
    }
    std::env::current_dir().unwrap_or_default().join("backend")
}

fn call_python_backend(args: &[&str]) -> Result<BridgeResponse, String> {
    let python = find_python();
    let backend = backend_dir();

    let mut cmd = Command::new(&python);
    cmd.arg("-m").arg("src.converter").args(args).current_dir(&backend);

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000);
    }

    let output = cmd.output().map_err(|e| {
        format!("无法启动 Python 后端 ({}): {}\n后端路径: {:?}", python, e, backend)
    })?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if !output.status.success() {
        let error_msg = if stderr.is_empty() {
            format!("Python 进程退出码: {}", output.status.code().unwrap_or(-1))
        } else {
            let lines: Vec<&str> = stderr.lines().collect();
            let tail = if lines.len() > 5 {
                lines[lines.len() - 5..].join("\n")
            } else {
                stderr.clone()
            };
            format!("Python 错误: {}", tail)
        };
        return Err(error_msg);
    }

    serde_json::from_str::<BridgeResponse>(&stdout).map_err(|e| {
        format!(
            "无法解析 Python 输出: {}\n原始输出(前200字符): {}",
            e,
            &stdout.chars().take(200).collect::<String>()
        )
    })
}

// ---- Tauri 命令 ----

#[tauri::command]
async fn health_check() -> Result<HealthResult, String> {
    match call_python_backend(&["health"]) {
        Ok(response) => {
            if response.success {
                if let Ok(data) = serde_json::from_value::<HealthData>(response.data) {
                    return Ok(HealthResult {
                        available: true,
                        engine: Some(data.engine),
                        version: Some(data.protocol),
                        error: None,
                    });
                }
            }
            Ok(HealthResult { available: false, engine: None, version: None, error: response.error })
        }
        Err(e) => Ok(HealthResult { available: false, engine: None, version: None, error: Some(e) }),
    }
}

#[tauri::command]
async fn convert_document(file_path: String) -> Result<ConversionResult, String> {
    let response = call_python_backend(&["convert", &file_path])?;

    if response.success {
        match serde_json::from_value::<ConversionData>(response.data) {
            Ok(data) => Ok(ConversionResult {
                success: true,
                markdown: data.markdown,
                filename: Some(data.filename),
                error: None,
                metadata: data.metadata,
            }),
            Err(e) => Ok(ConversionResult {
                success: false,
                markdown: String::new(),
                error: Some(format!("数据解析错误: {}", e)),
                filename: None,
                metadata: None,
            }),
        }
    } else {
        Ok(ConversionResult {
            success: false,
            markdown: String::new(),
            error: response.error,
            filename: None,
            metadata: None,
        })
    }
}

/// 导出单个 Markdown 文件
#[tauri::command]
async fn export_markdown(request: ExportRequest) -> Result<ExportResult, String> {
    let file_path = if request.path.is_empty() {
        std::env::current_dir()
            .map_err(|e| e.to_string())?
            .join(&request.filename)
    } else {
        let dir_path = std::path::Path::new(&request.path);
        if !dir_path.exists() {
            std::fs::create_dir_all(dir_path)
                .map_err(|e| format!("无法创建目录: {}", e))?;
        }
        dir_path.join(&request.filename)
    };

    std::fs::write(&file_path, &request.content)
        .map_err(|e| format!("写入文件失败: {}", e))?;

    let path_str = file_path.to_string_lossy().to_string();

    Ok(ExportResult {
        success: true,
        file_path: path_str,
        error: None,
    })
}

/// 批量导出多个 Markdown 文件
#[tauri::command]
async fn batch_export(request: BatchExportRequest) -> Result<BatchExportResult, String> {
    let output_dir = std::path::Path::new(&request.output_dir);

    if !output_dir.exists() {
        std::fs::create_dir_all(output_dir)
            .map_err(|e| format!("无法创建输出目录: {}", e))?;
    }

    let mut results = Vec::new();

    for entry in &request.files {
        let file_path = output_dir.join(&entry.filename);
        match std::fs::write(&file_path, &entry.content) {
            Ok(_) => results.push(ExportResult {
                success: true,
                file_path: file_path.to_string_lossy().to_string(),
                error: None,
            }),
            Err(e) => results.push(ExportResult {
                success: false,
                file_path: entry.filename.clone(),
                error: Some(format!("写入失败: {}", e)),
            }),
        }
    }

    Ok(BatchExportResult {
        success: results.iter().all(|r| r.success),
        results,
        output_dir: request.output_dir,
    })
}

/// 在系统文件管理器中打开文件或文件夹
#[tauri::command]
async fn reveal_in_explorer(target_path: String) -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg("/select,")
            .arg(&target_path)
            .spawn()
            .map_err(|e| format!("无法打开资源管理器: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg("-R")
            .arg(&target_path)
            .spawn()
            .map_err(|e| format!("无法打开 Finder: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        let parent = std::path::Path::new(&target_path)
            .parent()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or(target_path.clone());
        Command::new("xdg-open")
            .arg(&parent)
            .spawn()
            .map_err(|e| format!("无法打开文件管理器: {}", e))?;
    }
    Ok(true)
}

#[tauri::command]
fn get_app_info() -> Value {
    let python = find_python();
    let python_version = Command::new(&python)
        .arg("--version")
        .output()
        .ok()
        .and_then(|o| {
            let s = String::from_utf8_lossy(&o.stdout);
            if s.is_empty() {
                String::from_utf8_lossy(&o.stderr).trim().to_string().into()
            } else {
                s.trim().to_string().into()
            }
        });

    serde_json::json!({
        "name": "Book2Markdown Desktop",
        "version": "0.1.0",
        "python_path": python,
        "python_version": python_version,
        "backend_dir": backend_dir().to_string_lossy(),
    })
}

// ---- 应用入口 ----

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            health_check,
            convert_document,
            export_markdown,
            batch_export,
            reveal_in_explorer,
            get_app_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
