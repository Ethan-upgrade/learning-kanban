use std::{
    net::TcpStream,
    process::Command,
    thread,
    time::{Duration, Instant},
};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

const DEFAULT_PROJECT_ROOT: &str = "D:\\agent-projects\\learning-kanban";
const APP_URL: &str = "http://127.0.0.1:4173";

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let project_root =
                std::env::var("CJ_BOARD_ROOT").unwrap_or_else(|_| DEFAULT_PROJECT_ROOT.to_string());
            start_cj_board_service(&project_root);
            wait_for_port(4173, Duration::from_secs(10));

            tauri::WebviewWindowBuilder::new(
                app,
                "main",
                tauri::WebviewUrl::External(APP_URL.parse().expect("valid app URL")),
            )
            .title("CJ Board")
            .inner_size(1180.0, 820.0)
            .min_inner_size(960.0, 680.0)
            .resizable(true)
            .center()
            .build()?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running CJ Board");
}

fn start_cj_board_service(project_root: &str) {
    let script = format!("{project_root}\\scripts\\start-studyboard.ps1");
    let mut command = Command::new("powershell.exe");
    command.args([
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-WindowStyle",
        "Hidden",
        "-File",
        &script,
        "-ProjectRoot",
        project_root,
        "-Port",
        "4173",
    ]);

    #[cfg(target_os = "windows")]
    command.creation_flags(0x08000000);

    let _ = command.spawn();
}

fn wait_for_port(port: u16, timeout: Duration) {
    let start = Instant::now();
    while start.elapsed() < timeout {
        if TcpStream::connect(("127.0.0.1", port)).is_ok() {
            return;
        }
        thread::sleep(Duration::from_millis(200));
    }
}
