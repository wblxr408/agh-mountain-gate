# Agnes Harness 山水入户

在 Agnes Harness 的 Web 工作台打开一扇实时渲染的古门。点击「推门入户」，沿 18 秒原版镜头跟随旅人穿过木门，山水原图随后成为工作台背景。也可以点「直入办公」或按 Esc 跳过。系统开启减少动态时直接进入工作台。

## 安装

```sh
agh plugins add git:https://github.com/wblxr408/agh-mountain-gate#runtime-v1.0.5
```

打开新的工作台标签页即可体验。插件通过 Agnes Harness 客户端 SDK 的 `shell.overlay` 插槽展示开场和背景。它声明 `ui` 能力，需要宿主提供 React 18.3.1 和插件 API 5。选择这一开场的配置中，禁用其他开场插件可避免两段动画同时出现。

## 素材和依赖

- 古门、运镜、人物动作和原始山水来自《天时经纬》。山水和人物贴图由原作品创作，门框、材质和粒子实时绘制。
- Three.js 0.186.1 的 WebGL 构建随插件提供，MIT 许可见 [licenses/three-MIT.txt](licenses/three-MIT.txt)。
- 标题优先使用设备已安装的 Engravers MT。安装包使用开放许可的 Cinzel 作为后备，并使用 Noto Sans SC 显示中文。两个开放字体的 WOFF2 子集由 `src/fonts.js` 提供，许可证见 [licenses](licenses/)。
