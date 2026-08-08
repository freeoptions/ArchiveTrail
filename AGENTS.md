# ArchiveTrail 项目专属规则

通用规则见：`E:\@imFile-Download\AI-Useful-Prompt\通用开发工作规则.md`。

- 本项目是 Tauri + Vue/TypeScript 的 Windows 桌面应用，前端入口在 `src`，Rust/Tauri 入口在 `src-tauri`。
- 开发命令：`npm run dev`；前端检查/构建命令：`npm run build`。
- 获得构建授权后使用项目已有的 `npm run build:exe`，不要用裸 `cargo build --release` 代替正式交付。
- 项目名与交付映射：`ArchiveTrail -> ArchiveTrail.exe`。
- 最终 Windows 产物只复制到 `D:\@Software\ArchiveTrail\ArchiveTrail.exe`，不要复制 `target`、`dist` 或其他中间目录。
- 未经“11”“构建”或“打包”授权，不构建最终 EXE。
