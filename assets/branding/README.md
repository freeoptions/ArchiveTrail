# ArchiveTrail 图标来源与生成

`whiteboard-original.png` 是用户提供的原始素材，保留原始文件字节。
来源链接、版权声明及完整 MIT 许可见
[`../../public/icons/SOURCE-AND-LICENSE.txt`](../../public/icons/SOURCE-AND-LICENSE.txt)。
该许可文件也随前端公共资源嵌入应用；后续分发应保留完整声明。

Windows 资源由 `app-icon-resources` 技能的 `icon_resources.py` 确定性生成：

```text
python -B -X utf8 <技能目录>/scripts/icon_resources.py generate assets/branding/whiteboard-original.png --platform windows --output <新的独立输出目录>
```

保持完整原图画布、比例、颜色和透明背景，默认零额外留白，不裁透明边、不重绘、不增加底板或阴影。

资源入口：

- `public/icons/archive-trail.png`：256px，界面品牌图标及 `index.html` 网页图标。
- `src-tauri/icons/archive-trail-{32,128,256}.png`：Tauri 默认窗口图标，供窗口及任务栏使用。
- `src-tauri/icons/archive-trail.ico`：Windows EXE 图标，含 16、20、24、32、40、48、64、96、128、256px，32px 帧排首位。
- `src-tauri/icons/archive-trail-tray.rgba`：生成的 32px PNG 解码为 RGBA 原始字节，由 Rust `create_tray_icon` 内嵌。

PNG 和 ICO 的映射由 `src-tauri/tauri.conf.json` 以及实际代码引用确定。
未被 Windows 实际入口引用的旧兼容资源及 macOS ICNS 不属于本次替换范围。
资源校验不代表正式构建或系统显示已验证；实际 EXE 将在后续获授权打包时更新。
