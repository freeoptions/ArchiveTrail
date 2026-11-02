fn main() {
    println!("cargo:rerun-if-changed=icons/archive-trail.ico");
    tauri_build::build()
}
