# ArchiveTrail 项目专属规则

通用规则见：`E:\@imFile-Download\AI-Useful-Prompt\通用开发工作规则.md`。

- 本项目是 Tauri + Vue/TypeScript 的 Windows 桌面应用，前端入口在 `src`，Rust/Tauri 入口在 `src-tauri`。
- 开发命令：`npm run dev`；前端检查/构建命令：`npm run build`。
- 获得构建授权后使用项目已有的 `npm run build:exe`，不要用裸 `cargo build --release` 代替正式交付。
- 项目名与交付映射：`ArchiveTrail -> ArchiveTrail.exe`。
- 最终 Windows 产物只复制到 `D:\@Software\ArchiveTrail\ArchiveTrail.exe`，不要复制 `target`、`dist` 或其他中间目录。
- 未经“11”“构建”或“打包”授权，不构建最终 EXE。

## UI 调整经验（已验证）

- 表单公共样式不要使用无范围的 `.form-group label` 覆盖嵌套控件；表单标题应优先使用 `.form-group > label`，避免覆盖单选、复选框和自定义选项的 `display: flex`、间距与对齐规则。
- 自定义复选框应让真实 `input[type="checkbox"]` 保留可访问性并负责交互，使用 `appearance: none` 或规范的视觉隐藏方式绘制状态；不要使用整块透明 input 叠加额外视觉元素，容易造成文字贴边和布局错位。
- 字段编辑行优先采用 CSS Grid：拖拽手柄、字段名称、字段类型、选项区和删除按钮分别占位；字段名称列宽可按当前字段最长内容计算，选项区使用 `max-content`，减少无意义空白。
- 字段选项区使用 `flex` 配合固定控件间距，标签内部使用 `align-items: center`；桌面端保持一行，只有容器宽度不足时才换行，禁止用过大的固定最小宽度强行撑开内容。
- UI 修改完成后必须先执行 `npm run build` 和 `git diff --check`；确认视觉效果后，收到“11”“构建”或“打包”再执行正式 Release 构建。
