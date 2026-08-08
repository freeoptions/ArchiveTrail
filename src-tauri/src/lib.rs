use tauri::Manager;
use tauri::image::Image;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::AppHandle;
use base64::{engine::general_purpose, Engine as _};
use std::path::PathBuf;
use std::fs;

#[cfg(target_os = "windows")]
use windows_sys::Win32::UI::Shell::ShellExecuteW;
#[cfg(target_os = "windows")]
use windows_sys::Win32::Foundation::HWND;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to ArchiveTrail.", name)
}

/// Open URL in default browser using shell
#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return Err("Empty URL".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        let wide: Vec<u16> = trimmed.encode_utf16().chain(std::iter::once(0)).collect();
        let open: Vec<u16> = "open".encode_utf16().chain(std::iter::once(0)).collect();
        let result = unsafe {
            ShellExecuteW(
                0 as HWND,
                open.as_ptr(),
                wide.as_ptr(),
                std::ptr::null(),
                std::ptr::null(),
                1,
            )
        };
        let code = result as usize;
        if code <= 32 {
            return Err(format!("Failed to open URL: {}", code));
        }
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(trimmed)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(trimmed)
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }
    Ok(())
}

/// Get the data directory for storing data (exe directory for portable mode)
fn get_data_dir(_app: &AppHandle) -> PathBuf {
    if cfg!(debug_assertions) {
        // In dev mode, use data folder in project root
        let mut path = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        if path.ends_with("src-tauri") {
            path = path.parent().unwrap_or(&path).to_path_buf();
        } else if path.ends_with("target") {
            path = path.parent().unwrap_or(&path).to_path_buf();
            if path.ends_with("src-tauri") {
                path = path.parent().unwrap_or(&path).to_path_buf();
            }
        }
        path.push("data");
        path
    } else {
        // In release mode, use the exe directory (portable mode)
        std::env::current_exe()
            .and_then(|exe_path| exe_path.parent().map(|p| p.to_path_buf()).ok_or_else(|| std::io::Error::new(std::io::ErrorKind::NotFound, "No parent dir")))
            .unwrap_or_else(|_| PathBuf::from("."))
    }
}

/// Get the data directory path as string (for frontend use)
#[tauri::command]
fn get_data_dir_path(app: AppHandle) -> Result<String, String> {
    let data_dir = get_data_dir(&app);
    data_dir.to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Failed to convert data directory path to string".to_string())
}

/// Read the data file
#[tauri::command]
fn read_data(app: AppHandle) -> Result<String, String> {
    let data_dir = get_data_dir(&app);
    let data_file = data_dir.join("data.json");

    fs::read_to_string(&data_file)
        .map_err(|e| format!("Failed to read data: {}", e))
}

/// Write the data file
#[tauri::command]
fn write_data(app: AppHandle, data: String) -> Result<(), String> {
    let data_dir = get_data_dir(&app);

    // Ensure directory exists
    fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Failed to create data directory: {}", e))?;

    let data_file = data_dir.join("data.json");
    fs::write(&data_file, data)
        .map_err(|e| format!("Failed to write data: {}", e))
}

fn image_extension_from_data_url(header: &str) -> Result<&'static str, String> {
    if header.contains("image/png") {
        return Ok("png");
    }
    if header.contains("image/jpeg") || header.contains("image/jpg") {
        return Ok("jpg");
    }
    if header.contains("image/webp") {
        return Ok("webp");
    }
    if header.contains("image/gif") {
        return Ok("gif");
    }
    if header.contains("image/bmp") {
        return Ok("bmp");
    }
    Err("Unsupported image type".to_string())
}

fn sanitize_file_stem(file_stem: &str) -> String {
    let mut sanitized = String::with_capacity(file_stem.len());
    for ch in file_stem.chars() {
        if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
            sanitized.push(ch);
        } else {
            sanitized.push('_');
        }
    }

    let trimmed = sanitized.trim_matches('_');
    if trimmed.is_empty() {
        "image".to_string()
    } else {
        trimmed.chars().take(120).collect()
    }
}

#[tauri::command]
fn save_inline_image(app: AppHandle, data_url: String, file_stem: String) -> Result<String, String> {
    let (header, encoded) = data_url
        .split_once(',')
        .ok_or_else(|| "Invalid image data".to_string())?;

    if !header.starts_with("data:image/") || !header.contains(";base64") {
        return Err("Invalid image data".to_string());
    }

    let extension = image_extension_from_data_url(header)?;
    let bytes = general_purpose::STANDARD
        .decode(encoded)
        .map_err(|e| format!("Failed to decode image: {}", e))?;

    let data_dir = get_data_dir(&app);
    let pics_dir = data_dir.join("pics");
    fs::create_dir_all(&pics_dir)
        .map_err(|e| format!("Failed to create pics directory: {}", e))?;

    let safe_stem = sanitize_file_stem(&file_stem);
    let mut file_name = format!("{}.{}", safe_stem, extension);
    let mut dest = pics_dir.join(&file_name);
    let mut suffix = 1;
    while dest.exists() {
        file_name = format!("{}-{}.{}", safe_stem, suffix, extension);
        dest = pics_dir.join(&file_name);
        suffix += 1;
    }

    fs::write(&dest, bytes)
        .map_err(|e| format!("Failed to save image: {}", e))?;

    Ok(format!("pics/{}", file_name))
}

/// Get the icons directory path
#[tauri::command]
fn get_icons_dir(app: AppHandle) -> Result<String, String> {
    let data_dir = get_data_dir(&app);
    let icons_dir = data_dir.join("icons");

    // Ensure directory exists
    fs::create_dir_all(&icons_dir)
        .map_err(|e| format!("Failed to create icons directory: {}", e))?;

    icons_dir.to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Failed to convert icons path to string".to_string())
}

/// Copy an icon file to the icons directory and return the new path
#[tauri::command]
fn copy_icon_to_icons(app: AppHandle, source_path: String) -> Result<String, String> {
    let data_dir = get_data_dir(&app);
    let icons_dir = data_dir.join("icons");

    // Ensure icons directory exists
    fs::create_dir_all(&icons_dir)
        .map_err(|e| format!("Failed to create icons directory: {}", e))?;

    let source = PathBuf::from(&source_path);
    let file_name = source.file_name()
        .ok_or_else(|| "Invalid file name".to_string())?;

    let dest = icons_dir.join(file_name);

    // Copy the file
    fs::copy(&source, &dest)
        .map_err(|e| format!("Failed to copy icon: {}", e))?;

    // Return the relative path for storage
    Ok(format!("icons/{}", file_name.to_string_lossy()))
}

/// List available icons in the icons directory
#[tauri::command]
fn list_icons(app: AppHandle) -> Result<Vec<String>, String> {
    let data_dir = get_data_dir(&app);
    let icons_dir = data_dir.join("icons");

    if !icons_dir.exists() {
        return Ok(vec![]);
    }

    let mut icons = vec![];
    if let Ok(entries) = fs::read_dir(&icons_dir) {
        for entry in entries.flatten() {
            if let Some(name) = entry.file_name().to_str() {
                // Only include image files
                let lower = name.to_lowercase();
                if lower.ends_with(".png") || lower.ends_with(".jpg") || lower.ends_with(".jpeg") || lower.ends_with(".ico") || lower.ends_with(".svg") {
                    icons.push(format!("icons/{}", name));
                }
            }
        }
    }

    Ok(icons)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main_window(app);
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .setup(|app| {
            // Setup system tray
            if let Err(e) = setup_tray(app) {
                eprintln!("Failed to setup tray: {}", e);
            }

            // Handle window close event - hide instead of close
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.maximize();
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    match event {
                        tauri::WindowEvent::CloseRequested { api, .. } => {
                            api.prevent_close();
                            let _ = window_clone.hide();
                        }
                        _ => {}
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet, read_data, write_data, save_inline_image, get_icons_dir, copy_icon_to_icons, list_icons, get_data_dir_path, open_url])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    // Create tray menu items
    let show_item = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "退出程序", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

    let icon = create_tray_icon();

    // Build tray icon with menu
    let _tray = TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("ArchiveTrail - 内容档案管理")
        .on_menu_event(move |app: &AppHandle, event| {
            match event.id.0.as_str() {
                "show" => {
                    show_main_window(app);
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::Click {
                button: tauri::tray::MouseButton::Left,
                button_state: tauri::tray::MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                toggle_main_window(app);
            }
        })
        .build(app)?;

    Ok(())
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn toggle_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let is_visible = window.is_visible().unwrap_or(false);
        let is_minimized = window.is_minimized().unwrap_or(false);

        if is_visible && !is_minimized {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.unminimize();
            let _ = window.set_focus();
        }
    }
}

fn create_tray_icon() -> Image<'static> {
    const TRAY_ICON_RGBA: &[u8] = include_bytes!("../icons/archive-trail-tray.rgba");
    Image::new(TRAY_ICON_RGBA, 32, 32)
}
