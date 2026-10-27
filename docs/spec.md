# bugsnag-cli v0.1 Spec

只读 BugSnag API CLI，面向 AI agent 与 shell 自动化：拉取错误列表、错误详情、事件全文与错误维度拆解，供 LLM 做 root-cause 分析。

## 参考基线

- 架构范式：`/Users/mack/Cli-projects/glitchtip-cli`（同代 Zod 驱动 CLI，结构最接近，代码直接参照）
- API 全量规格：`/Users/mack/Agents/research-agent/output/bugsnag-api-v2.apib`（官方 API Blueprint 落盘副本）
- 在线文档：https://bugsnagapiv2.docs.apiary.io

## 硬性约束（用户确认）

1. **只读**：无 discard/delete/update 等写操作（写操作留 TODO 不实现）
2. **分页受控**：无 `--all`，永远没有无界遍历；`--per-page` + `--limit` 控制
3. 仅云端 Personal Auth Token 鉴权（on-prem Basic Auth 不实现）

## 鉴权与配置

- Base URL 默认 `https://api.bugsnag.com`
- 请求头：`Authorization: token <PERSONAL-AUTH-TOKEN>` + `Accept: application/json`
- Token 来源：https://app.bugsnag.com/settings/my-account
- 配置优先级：CLI flags → env vars（`BUGSNAG_AUTH_TOKEN` / `BUGSNAG_BASE_URL` / `BUGSNAG_ORGANIZATION` / `BUGSNAG_PROJECT` / `BUGSNAG_PROFILE`）→ `~/.bugsnagrc` profiles（`-p` 切换）
- profile 字段：`auth-token`、`base-url`、`organization`（可选，默认 org）、`project`（可选，默认 project）
- 已实现脚手架 `src/config/config.ts`（含 legacy key 兼容读取 `authToken`/`auth_token`）

## 核心语义约定

### 分页（Bugsnag 用 `Link` 头 + `X-Total-Count`）

- 响应头形如 `Link: <https://api.bugsnag.com/...?offset=xxx&...>; rel="next"`，`X-Total-Count: 123`
- 所有 list 命令：`--per-page <n>`（每次请求页大小，默认 30 = API 默认）+ `--limit <n>`（累计获取上限，默认 100）
- 遍历规则：沿 `rel="next"` 请求下一页，直到响应无 next Link 或累计条数 ≥ limit 即停；**不存在 `--all`**

### ID 解析（slug vs 24-hex id）

- `--project` / `--organization` 接受 24-hex ID（直接使用）或名称/slug（走解析）
- org 解析：`GET /user/organizations` 结果内按 id/name 匹配
- project 解析：默认 org 下的 `GET /organizations/{id}/projects` 结果内按 id/slug/name 匹配；结果缓存于进程内存（同 glitchtip 的 resolver cache 模式）
- 解析失败：`Error: Project '<name>' not found under organization '<org>'`（JSON 模式同格式包 `{ isError: true, error }`）

### Filters（v0.1 支持 eq / ne / empty）

用户输入 `--filter <expr>`（可重复出现），expr 形式与序列化：

| 输入 | 序列化 |
|------|--------|
| `k=v` | `filters[k][][type]=eq` + `filters[k][][value]=v` |
| `k=v1,v2` | 每个 value 一组 eq |
| `k!=v` | `type=ne` |
| `k:empty=true\|false` | `filters[k][][type]=empty` + value |

常用字段：`error.status`（open/resolved/regression）、`app.version`、`release_stage`、`user.email`、`event.since`（相对 `1d`/绝对 ISO 皆可）、`event.before`。

### HTTP 客户端（沿用 glitchtip client 模式 + bugsnag 特有）

- 内置 fetch + 全局 30s AbortController 超时
- HTTP 429 → 读 `Retry-After` → sleep → 重试
- 响应 200 body 内 `{"errors":[...],"code":60000}`（排序结果超上限）→ 自动改为 `sort=unsorted` 重试一次
- 非 2xx：`Error: <detail>`；JSON 输出模式 `{ isError: true, error: "<message>" }` → exit 1
- query 序列化自动清理 `undefined/null/''`（同 apihz-cli）

### 输出

- 默认 TextOutput（数组 → 纯量列表格，嵌套对象/数组列跳过；对象 → JSON dump）
- `--json` → JsonOutput；`--raw` → 跳过格式化
- 错误统一格式（同 glitchtip）：text `Error: <message>`；json `{ isError: true, error }`；exit code 1

## v0.1 命令面（12 API 命令 + 6 config + 2 skill）

| 命令 | API | 参数 |
|------|-----|------|
| `org-list` | `GET /user/organizations` | `--per-page` `--limit` |
| `project-list` | `GET /organizations/{organization_id}/projects` | `--organization`、`--q`、`--sort`（created_at/name/favorite）、`--direction`、`--per-page` `--limit` |
| `project-show` | `GET /projects/{project_id}` | positional `<projectId>` |
| `error-list` | `GET /projects/{project_id}/errors` | `--project`、`--sort`（last_seen/first_seen/users/events）、`--direction`、`--base <ISO>`、`--filter`、`--per-page` `--limit` |
| `error-show` | `GET /projects/{project_id}/errors/{error_id}` | positional `<errorId>` |
| `error-events` | `GET /projects/{project_id}/errors/{error_id}/events` | `<errorId>` positional、`--full-reports`（默认 true）、`--sort`（timestamp）、`--direction`、`--base`、`--filter`、`--per-page` `--limit` |
| `error-latest-event` | `GET /errors/{error_id}/latest_event` | positional `<errorId>`（无需 project） |
| `event-show` | `GET /projects/{project_id}/events/{event_id}` | positional `<eventId>` |
| `error-pivots` | `GET /projects/{project_id}/errors/{error_id}/pivots` | `<errorId>` positional、`--pivots <f1,f2>`、`--summary-size <n>`、`--filter`、`--per-page` `--limit` |
| `error-pivot-values` | `GET /projects/{project_id}/errors/{error_id}/pivots/{event_field_display_id}/values` | positionals `<errorId> <fieldId>`、`--sort`、`--base`、`--filter` |
| `error-trend` | `GET /projects/{project_id}/errors/{error_id}/trend` | `<errorId>` positional、`--buckets-count <n>`（默认模式）、`--resolution`（互斥切换到 resolution 模式）、`--filter` |
| `event-fields` | `GET /projects/{project_id}/event_fields` | 列出可用 pivot/filter 字段（拼 filter/pivots 参数时给 agent 导航） |
| `config-show/set/list/use/new/path` | 本地 | 同 glitchtip 语义 |
| `skill-install` / `skill-uninstall` | 本地 | 同 glitchtip 模板 → bugsnag 版 SKILL.md |

带 `--project`/`--organization` 语义的命令：接收 id 或名称（见上"ID 解析"）。`project` 配置里默认值自动注入。

## 明确不做（v0.1）

- 写操作：error discard/delete/update、issue 状态管理、项目/组织管理
- on-prem Basic Auth
- `events` 双向流（webhook 类）
- trends on project（错误级 trend 已够 AI 分析；project 级留 v0.2）

## AI 分析三件套输出建议

配套在 SKILL.md 的 pitfalls 中写明：分析一个错误的标准拉取链 = `error-latest-event`（最快拿全堆栈）→ `error-events --full-reports --limit 5`（对比多次事件找共性）→ `error-pivots --summary-size 5`（维度归因）→ `error-trend`（时间聚类，判断新 regression 还是慢性问题）。
