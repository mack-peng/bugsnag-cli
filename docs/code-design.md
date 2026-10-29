# bugsnag-cli v0.2 Code Design

- Spec：`docs/spec.md`
- API 真值：`docs/api/bugsnag-data-access-openapi.json`（SwaggerHub v2，141 operations）
- 覆盖矩阵：`docs/api-coverage.md`
- v0.1 实现计划：见 git history（commit `5387c55` 之前）；本文只记录 v0.2 扩展
- 说明：本项目是 Node.js/TypeScript CLI，无 FE/BE 分层，合并为一份 Code Design

## Change Groups

### C1 — API 基线与覆盖矩阵

- [新增] `docs/api/bugsnag-data-access-openapi.json`：当前 OpenAPI 原文
- [新增] `docs/api/README.md`：来源、抓取日期、live API 偏差
- [新增] `docs/api-coverage.md`：141 个操作的 `EXISTING / P0-READ / P0-WRITE / P1-READ / P2-READ / EXCLUDED-WRITE` 状态

### C2 — Command schema / help

- [修改] `src/cli/command.ts`
  - `Category` 增加 `releases` / `performance` / `comments`
  - `CommandSchema` 增加 `mutating` / `pagination` / `perPage`
  - 新增 `assertWriteAllowed()`
- [修改] `src/config/helpGenerator.ts`
  - 新增分类与 `--write` 说明

### C3 — Client：offset 分页与 204

- [修改] `src/api/client.ts`
  - `ListOptions` 增加 `pagination` / `offset`
  - `list()` 增加 offset 模式：短页、空页或达到 `--limit` 停止
  - `request()` 对 204 返回 `null`
  - 导出 `DEFAULT_LIMIT` / `DEFAULT_PER_PAGE`

### C4 — 路径段编码

- [新增] `src/api/path.ts`
  - 逐字符/`%XX` 处理：保留已有转义，编码裸 `/` 与其他保留字符
  - 用于 span group id、field id、trace id、comment id、release id

### C5 — Program：写闸门与 dispatch

- [修改] `src/cli/program.ts`
  - 注册全局 `--write`
  - `assertWriteAllowed()` 在派发前拒绝未授权的 mutating 命令
  - body 方法不再把 CLI flags 塞进 query
  - 只有存在 `transformRequest` 时才使用 transformed params；避免无 transform 命令泄漏 `filter` / `project` / `per-page`
  - list 命令按 `pagination` / `perPage` 接线

### C6 — P0 读命令（12）

`event-list`、`project-pivots`、`project-pivot-values`、`project-trend`、`project-stability`、`saved-search-list`、`saved-search-show`、`release-list`、`release-show`、`release-group-list`、`release-group-show`、`comment-list`。

关键点：

- `project-trend` 使用 live API 的单数 `/trend`
- `release-list` 的 `per_page` 上限 10
- `release-group-list` 的 `release-stage-name` 必填
- `comment-list` 使用 offset 分页
- `stability_trend` 204 按空结果处理

### C7 — P0 triage 写命令（2）

`error-update`、`error-bulk-update`，均 `mutating: true`，必须 `--write`。

- 操作子集：`open`、`fix`、`ignore`、`snooze`、`discard`、`undiscard`、`assign`、`override_severity`
- 不做 delete、create/link/unlink issue、comment 写
- `assign` / `snooze` / `override_severity` 在请求前校验参数组合
- bulk update 的 `error_ids` 以重复 query key 发送

### C8 — P1 性能读命令（16）

span groups（list / summaries / show / timeline / distribution / performance targets / spans / by-name）、starred span groups、page load span groups（list / show）、trace fields、trace spans（project / org）、performance overview、network grouping。

关键点：

- 性能过滤使用事件式 `filters[field][][type]`；`PerformanceFilter[]` 实测 400
- span group id 走 `encodePathSegment`
- span group / page load 使用 offset 分页；starred 使用 `page_token`/Link
- `trace-spans` / `org-trace-spans` 的 `from` / `to` 必填

### C9 — Text views

- [修改] `src/cli/program.ts`
  - 新增 pivots / trend / stability / saved search / release / comment / span group / trace field / performance overview 的文本表格
  - `error-update` / `error-bulk-update` 输出 status / discarded / assigned
  - comment email 脱敏

### C10 — 测试

- `tests/client.test.ts`：offset 分页（短页、空页、limit、对象包裹响应、自定义 offset、非法 per_page）、204、PATCH/429/60000 回归
- `tests/command.test.ts`：写闸门、trend 互斥与 buckets 上限、assign/snooze 校验、bulk path、pivots[]/categories[]
- `tests/path.test.ts`：路径编码与歧义形态

### C11 — 文档 / Skill / Agent / 版本

- `README.md`、`AGENTS.md`、`docs/spec.md`、`docs/guide/installation.md`
- `src/installer/skill-template.ts`：SKILL.md + pitfalls.md
- `bugsnag-agent/AGENTS.md`：默认只读 + 显式写边界
- `package.json`：`0.2.0`

## Live API Findings（2026-10-29）

1. 错误级与项目级 trend 使用单数 `/trend`；OpenAPI 的复数 `/trends` 返回 404。
2. 性能端点接受事件式 filters；`PerformanceFilter[]` 返回 400。
3. `starred_span_groups` 使用 `page_token`，发送 `offset=0` 返回 400。
4. `performance_overview` 在当前组织返回 403（无 performance-scores 套餐）。
5. `pivots` / `categories` 必须使用 `pivots[]` / `categories[]`；裸 `pivots=` 返回 400。
6. `span_groups` 可能因无数据返回空数组；依赖真实 ID 的性能命令需在有数据项目补验。

## Verification

- `npm run typecheck` ✅
- `npm test` ✅ 86 tests
- `npm run build` ✅ 42 API commands / 50 total commands
- `npm pack` + local install ✅
- P0 读命令真机验证 ✅
- P1 性能 smoke：list / summaries / starred / page-load / trace-fields / network grouping ✅；span 数据为空，部分命令记录阻塞
- 写验证：test-kodi 测试 error，fix/open/ignore/snooze/discard/undiscard/assign/unassign/bulk fix ✅；最终 ignored + discarded

## Out of Scope

delete、issue 链接、comment 写、Build/Upload API、P2 管理域、高级 `filter_groups`、无界 `--all`、替代 Dashboard。
