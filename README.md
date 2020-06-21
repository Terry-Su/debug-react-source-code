## 快速使用
### 方法1: 线上调试
![](https://terry-su.github.io/assets/blogs/debug-react-source-code-in-special-way/online-example.png)
访问地址：https://terry-su.github.io/debug-react-source-code/example/react-16.13.1


### （推荐）方法2：下载对应直接调试源码文件
优势是可修改源码，比如在源码中添加注释。
使用步骤：
1 . 选择要调试的React版本对应分支,然后点击下载压缩包。

版本列表（持续更新）：
* [debug-react-16.13.1](https://github.com/Terry-Su/debug-react-source-code/tree/debug-react-16.13.1)
*  [debug-react-16.6.0](https://github.com/Terry-Su/debug-react-source-code/tree/debug-react-16.6.0)

![](https://terry-su.github.io/assets/blogs/debug-react-source-code-in-special-way/switch-branch.png)
![](https://terry-su.github.io/assets/blogs/debug-react-source-code-in-special-way/download.png)

2 . 将压缩包解压后，用vscode打开该文件夹。vscode需安装[Debugger for Chrome](https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome)插件，用于在vscode对源码添加断点

3 . 安装依赖后，开启服务
```
npm install
```
```
npm start
```

4 . 在源码中添加断点，按F5启动调试即可
![](https://terry-su.github.io/assets/blogs/debug-react-source-code-in-special-way/vscode-example.png)

## 目录结构
目录结构为：
```
/react.development/
/react-dom.development/
/babel.js
/dependency-main.html
/dependency-react.html
/dependency-react-dom.html
/index.html
/index.js
```
其中，`index.js`即为调试入口文件。


## 实现原理
请查看[“另辟蹊径搭建阅读React源码调试环境-支持所有React版本断点调试细分文件”](https://terry-su.github.io/cn/debug-react-source-code-using-special-method)