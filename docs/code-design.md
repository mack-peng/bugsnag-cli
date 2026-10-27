# bugsnag-cli v0.1 Code Design

交付给 code-agent 的变更组清单。每组的 Filename 三件套 + tech notes。执行顺序 C1 → C6，每组完成即 `npm run typecheck`，全部完成后 C5 验证 + `npm test`。

## 设计基准（必读）

- **结构性蓝本**：`/Users/mack/Cli-projects/glitchtip-cli/src/**` — 同代最佳实现，所有新文件模仿它的 import 风格、命名、Zod schema 写法、错误处理。禁止引入 Commander；仅 `zod` 运行时依赖。
- **API 真值**：`/Users/mack/Agents/research-agent/output/bugsnag-api-v2.apib`（本地全量 Blueprint）。实现每个端点前先到该文件 grep 对应段落核对参数与响应字段。
- **需求语义**：`docs/spec.md`（同目录）— 命令面、分页规则、filters 序列化、ID 解析策略均已定案，不要临时发挥。
- 已由脚手架就位（**不要重写**）：`src/cli/minimist.ts`、`src/cli/command.ts`、`src/cli/output.ts`、`src/installer/**`（targets registry 原样）、`scripts/**`、`package.json`、`tsconfig.json`、`bin/bugsnag-cli.js`、`src/config/config.ts`（bugsnag 版已写好）。

---

## C1 — 接线 + API 客户端

**目标**：program 入口管线跑通 + BugsnagClient 全量 HTTP 能力。

- [新增] `src/index.ts`
  内容：`export { program } from './cli/program'`（同 glitchtip）。
- [新增] `src/cli/program.ts`
  主管线（照抄 glitchtip program.ts 的骨架）：`program(argv)` → `loadConfig(minimist)` → help.json 加载与 --help/--version 分发 → `parseCommand()` Zod 校验 → switch 按命令分发 → Output 输出。config 组/skill 组命令本地处理，API 组命令走 `dispatchRequest()` 前置 `injectContext()`。
- [新增] `src/api/client.ts` — `BugsnagClient`
  参照 glitchtip `src/api/client.ts` 改造：
  - `request(method, path, { query, perPage, limit })` — query 自动剔除 undefined/null/''；`per_page` 注入
  - `list()` — `Link: rel="next"` 解析循环 + `--limit` 上限累计 + `X-Total-Count` 透出
  - auth：`Authorization: token <TOKEN>`（token-only，不搞 Basic/OAuth）
  - 429 → `Retry-After` → sleep → 重试；30s AbortController
  - **60000 降级**：2xx body 若含 `{ errors, code: 60000 }` → 改 `sort=unsorted` 重试一次（仅 error-list 用 sorted 排序时）
  - Boolean query 值（`full_reports=true`）序列化为 `true` 字符串
- [新增] `src/api/auth.ts` — `TokenAuth`：单类型 Bearer-header 组装（比 glitchtip 更简）。
- [新增] `src/api/resolve.ts` — slug/id resolver + 内存缓存
  `resolveOrg(nameOrId)`（走 `GET /user/organizations` 匹配 id/name）、`resolveProject(orgId, nameOrId)`（走 org projects 列表匹配 id/slug/name）。24-hex（`/^[0-9a-f]{24}$/`）直接返回。

**验证**：`npm run typecheck`。

## C2 — config + skill 命令组

- [新增] `src/cli/commands.ts`（先建 `commandsArray`，逐组追加）
  - `config-show/set/list/use/new/path` — 语义照抄 glitchtip 同名命令；`config-set` 允许的 key：`auth-token`、`base-url`、`organization`、`project`；auth-token 值落盘返回 `****`。
  - `skill-install` / `skill-uninstall` — 声明同 glitchtip（实现模板内容在 C6）。
- [修改] `src/cli/program.ts` — 追加 config/skill 本地 dispatch 分支。

**验证**：typecheck。

## C3 — 组织与项目（导航层）

commands.ts 追加：

- `org-list` — `api: { method: 'GET', path: '/user/organizations' }`，`list: true`
- `project-list` — path `/organizations/{id}/projects`；`--organization` 经 resolver；`--q`、`--sort`、`--direction`
- `project-show` — `--project` 解析后 `GET /projects/{id}`

`injectContext()`：`config.project` 默认注入 `--project`、`config.organization` 注入 `--organization`。
TextOutput 表格列：org（id, name），project（id, slug, api key?屏蔽、type）。

**验证**：typecheck。

## C4 — 错误列表与详情

commands.ts 追加：

- `error-list` — `GET /projects/{project_id}/errors`；opts：`--sort`（enum last_seen/first_seen/users/events/unsorted）、`--direction`、`--base <ISO>`、`--filter`（可重复，见下方 transformNotes）、`--per-page`、`--limit`；默认 `sort=last_seen&direction=desc`
- `error-show` — positional `<errorId>`；`GET /projects/{project_id}/errors/{error_id}`

**transformNotes（error-list）**：
- `--filter` 表达式序列化到 `filters[FIELD][][type/value]`（规格见 docs/spec.md「Filters」表）：`k=v`→eq、`k!=v`→ne、`k:empty=true|false`→empty、`k=v1,v2`→多组 eq。实现为纯函数 `serializeFilters(exprs: string[])` 并配 unit test。
- 表格列（error）：id, crash_class, summary(截断), first_seen, last_seen, events_count, users_count, status。

**验证**：typecheck + `tests/filter.test.ts`（serializeFilters 各分支）。

## C5 — 事件 + pivots + trend（AI 分析核心）

commands.ts 追加：

- `error-events` — `<errorId>` positional，`GET .../events`；`--full-reports`（默认 true；布尔 query `true`）、`--sort`（仅 timestamp）、`--direction`、`--base`、`--filter`、`--per-page`、`--limit`
- `error-latest-event` — positional `<errorId>`，`GET /errors/{error_id}/latest_event`（**路径无 project_id**，纯 error 口径命令）
- `event-show` — positional `<eventId>`，`GET /projects/{project_id}/events/{event_id}`
- `error-pivots` — `<errorId>`，`GET .../pivots`；`--pivots <f1,f2>`、`--summary-size <n>`、`--filter`；list:true
- `error-pivot-values` — positionals `<errorId> <fieldId>`，`GET .../pivots/{id}/values`；`--sort`、`--base`、`--filter`
- `error-trend` — `<errorId>`，`GET .../trend`；`--buckets-count <n>`（bucket 模式默认）或 `--resolution`（互斥，二选一）
- `event-fields` — `GET /projects/{project_id}/event_fields`，`per_page=100`；供 agent 查可用 filter 字段名

TextOutput：event 默认输出做**分析友好裁剪**——对象输出常因 `--raw`/`--json` 需要拿全量；文本模式 eventId 列表输 `id, received_at, event_class(截断), message(截断), location(栈顶第一帧)`。`event-show` 文本模式渲染堆栈（Bugsnag event 的 `stacktrace` 数组 → 常规缩进栈帧列表）。

**验证**：typecheck。

## C6 — skill 模板 + 文档 + AGENTS.md

- [修改] `src/installer/skill-template.ts` — bugsnag 版 SKILL.md（简介 + 12 命令速查 + 分析拉取链建议）与 `pitfalls.md`（必含：60000 自动降级行为、Link 分页与 limit 停止语义、filters 括号语法仅 k=v/k!=v/k:empty、latest_event 无需 project、`--json` 供下游 jq 解析、**只读定位**——所有命令无写操作，修改 Bugsnag 状态请去 Dashboard）。
- [新增] `README.md` — 仿 glitchtip README：安装（npx / npm i -g）、配置（config-set auth-token）、示例命令、`--json` AI 用法。
- [新增] `AGENTS.md`（仓库根，项目活文档；仿 `glitchtip-cli/AGENTS.md` 结构：Project / Architecture / Key Patterns / Commands / Adding a Command / 测试说明。引用 docs/spec.md 为需求真值）。
- [修改] `scripts/generate-help.ts` + `src/config/helpGenerator.ts` — 若 glitchtip 版有硬编码品牌名，替换为 bugsnag。

**验证**：typecheck + `npm run build`（生成 help.json 成功）。

## C7 — 测试与收尾

- [新增] `tests/minimist.test.ts`、`tests/command.test.ts`、`tests/output.test.ts`、`tests/client.test.ts`、`tests/filter.test.ts` — 以 glitchtip 同名测试为蓝本增删；client.test 用 mock fetch 覆盖：token header、Link 分页 limit 截断、429 重试、60000 unsorted 降级、30s 超时。
- 全量验证：`npm run typecheck && npm test && npm run build`。
- 不 commit（由用户确认后另行 git init）。

---

## 横切约定（所有变更组）

- 不写注释；自描述命名。
- 英文 commit（本阶段**不 commit**，最后由用户决定）。
- `declareCommand()` 里 `describe()` 同时是生成 help.json 的真值——每个 flag 都要写。
- 所有 list 命令必须同时支持 `--per-page`（默认 30）与 `--limit`（默认 100）；`list: true` 遍历受 limit 封顶。
- 禁止引入新依赖。
