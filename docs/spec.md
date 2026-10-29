# bugsnag-cli v0.2 Spec

默认只读的 BugSnag API CLI，面向 AI agent 与 shell 自动化：拉取错误、事件、项目健康、发布回归、评论与性能数据；错误 triage 写操作必须显式 `--write`。

## 参考基线

- API 真值：SwaggerHub `smartbear-public/bugsnag-data-access-api` v2（OpenAPI 3.0.3，141 operations，2026-03-24 更新）
- 本地副本：`docs/api/bugsnag-data-access-openapi.json`
- 覆盖矩阵：`docs/api-coverage.md`
- v0.1 历史 Spec：本文件的前一版（12 个只读命令）

## 硬性约束

1. **默认只读**：写命令必须带全局 `--write`；本期仅 `error-update`、`error-bulk-update` 两个 mutating 命令。
2. **不做破坏性操作**：无 delete、无 create/link/unlink issue、无 comment 写操作；这些去 Dashboard。
3. **分页受控**：无 `--all`，永远没有无界遍历；Link 分页用 `--limit` 封顶，offset 分页用 `--offset` + `--limit`。
4. 仅云端 Personal Auth Token 鉴权（on-prem Basic Auth 不实现）。

## 鉴权与配置

- Base URL 默认 `https://api.bugsnag.com`
- 请求头：`Authorization: token <PERSONAL-AUTH-TOKEN>` + `Accept: application/json`
- 配置优先级：CLI flags → env vars（`BUGSNAG_AUTH_TOKEN` / `BUGSNAG_BASE_URL` / `BUGSNAG_ORGANIZATION` / `BUGSNAG_PROJECT` / `BUGSNAG_PROFILE`）→ `~/.bugsnagrc` profiles（`-p` 切换）
- profile 字段：`auth-token`、`base-url`、`organization`、`project`
- 全局 flags：`--json`、`--raw`、`-p/--profile`、`--auth-token`、`--base-url`、`--write`

## 核心语义

### 分页

- **Link 分页**：响应头 `Link: <...>; rel="next"` + `X-Total-Count`。用于 errors、events、error pivots、pivot values、releases、release groups。
- **Offset 分页**：`offset` + `per_page`。用于 span groups、span group summaries、page load span groups、comments。`starred-span-group-list` 的 live API 使用 `page_token`，CLI 走 Link 分页。
- 所有 list 命令支持 `--limit`（默认 100）；offset 命令额外支持 `--offset`（默认 0）。
- 某页返回条数小于 `per_page` 或累计达到 `--limit` 时停止。

### ID 解析

- `--project` / `--organization` 接受 24-hex ID 或名称/slug；CLI 自动解析并缓存。
- `error-latest-event`、`saved-search-show`、`release-group-show` 不需要 project 上下文。
- `org-trace-spans` 使用 `--organization`，不使用 project。
- 路径段编码只编码一次；已含合法 `%XX` 的 span group ID 不二次编码。

### Filters

`--filter` 可重复，支持：

| 输入 | 含义 |
|------|------|
| `k=v` | eq |
| `k=v1,v2` | 每个 value 一组 eq |
| `k!=v` | ne |
| `k:empty=true\|false` | emptiness |

- 序列化为 `filters[FIELD][][type]=...` / `filters[FIELD][][value]=...`
- 性能端点同样使用事件式 filters；`PerformanceFilter[]` 形式实测返回 400，不使用。
- 时间字段（`event.since`、`span.since` 等）接受 ISO 8601 UTC 或 `7d` 相对时间；时间字段不支持 `ne`。

### Trend 路径

- live API 使用单数 `/trend`；OpenAPI 的复数 `/trends` 实测返回 404。
- `error-trend` 与 `project-trend` 均使用单数路径。

### 空结果与 204

- `stability_trend` 返回 204 时视为空结果，不报错。
- list 命令空数组合法；JSON 保持 `[]`；text 模式显示 `(empty list)`。

### 输出

- 默认 TextOutput（数组 → 表格；对象 → JSON dump；长字符串截断）
- `--json` → JsonOutput；`--raw` → 跳过格式化
- 错误统一格式：text `Error: <message>`；json `{ isError: true, error }`；exit 1

## v0.2 命令面（42 个 API 命令）

### 组织与项目

| 命令 | API |
|------|-----|
| `org-list` | `GET /user/organizations` |
| `project-list` | `GET /organizations/{organization_id}/projects` |
| `project-show` | `GET /projects/{project_id}` |

### 错误与事件

| 命令 | API |
|------|-----|
| `error-list` | `GET /projects/{project_id}/errors` |
| `error-show` | `GET /projects/{project_id}/errors/{error_id}` |
| `error-events` | `GET /projects/{project_id}/errors/{error_id}/events` |
| `error-latest-event` | `GET /errors/{error_id}/latest_event` |
| `event-show` | `GET /projects/{project_id}/events/{event_id}` |
| `event-list` | `GET /projects/{project_id}/events` |
| `event-fields` | `GET /projects/{project_id}/event_fields` |

### Pivots、Trends、项目健康

| 命令 | API |
|------|-----|
| `error-pivots` | `GET /projects/{project_id}/errors/{error_id}/pivots` |
| `error-pivot-values` | `GET /projects/{project_id}/errors/{error_id}/pivots/{event_field_display_id}/values` |
| `error-trend` | `GET /projects/{project_id}/errors/{error_id}/trend` |
| `project-pivots` | `GET /projects/{project_id}/pivots` |
| `project-pivot-values` | `GET /projects/{project_id}/pivots/{event_field_display_id}/values` |
| `project-trend` | `GET /projects/{project_id}/trend` |
| `project-stability` | `GET /projects/{project_id}/stability_trend` |
| `saved-search-list` | `GET /projects/{project_id}/saved_searches` |
| `saved-search-show` | `GET /saved_searches/{id}` |

### 发布

| 命令 | API |
|------|-----|
| `release-list` | `GET /projects/{project_id}/releases` |
| `release-show` | `GET /projects/{project_id}/releases/{release_id}` |
| `release-group-list` | `GET /projects/{project_id}/release_groups` |
| `release-group-show` | `GET /release_groups/{id}` |

### 评论

| 命令 | API |
|------|-----|
| `comment-list` | `GET /projects/{project_id}/errors/{error_id}/comments` |

### 性能

| 命令 | API |
|------|-----|
| `span-group-list` | `GET /projects/{project_id}/span_groups` |
| `span-group-summaries` | `GET /projects/{project_id}/span_group_summaries` |
| `span-group-show` | `GET /projects/{project_id}/span_groups/{id}` |
| `span-group-timeline` | `GET /projects/{project_id}/span_groups/{id}/timeline` |
| `span-group-distribution` | `GET /projects/{project_id}/span_groups/{id}/distribution` |
| `span-group-performance-targets` | `GET /projects/{project_id}/span_groups/{id}/performance_targets` |
| `span-group-spans` | `GET /projects/{project_id}/span_groups/{id}/spans` |
| `span-group-spans-by-name` | `GET /projects/{project_id}/span_group_categories/{category}/span_groups/{name}/spans` |
| `starred-span-group-list` | `GET /projects/{project_id}/starred_span_groups` |
| `page-load-span-group-list` | `GET /projects/{project_id}/page_load_span_groups` |
| `page-load-span-group-show` | `GET /projects/{project_id}/page_load_span_groups/{id}` |
| `trace-fields` | `GET /projects/{project_id}/trace_fields` |
| `trace-spans` | `GET /projects/{project_id}/traces/{trace_id}/spans` |
| `org-trace-spans` | `GET /organizations/{organization_id}/traces/{trace_id}/spans` |
| `performance-overview` | `GET /projects/{project_id}/performance_overview` |
| `network-grouping-show` | `GET /projects/{project_id}/network_endpoint_grouping` |

### 错误 triage（必须 `--write`）

| 命令 | API | 操作 |
|------|-----|------|
| `error-update <errorId>` | `PATCH /projects/{project_id}/errors/{error_id}` | `open`、`fix`、`ignore`、`snooze`、`discard`、`undiscard`、`assign`、`override_severity` |
| `error-bulk-update` | `PATCH /projects/{project_id}/errors?error_ids=...` | 同上；`--error-ids` 逗号分隔 |

- `assign`：`--assigned-collaborator-id` / `--assigned-team-id` 互斥，或用 `--unassign`。
- `snooze`：`--reopen-if` + 对应规则参数（`--seconds` / `--occurrences` + `--hours` / `--additional-occurrences` / `--additional-users`）。
- `override_severity`：必须提供 `--severity info|warning|error`。

### 本地命令

- `config-show/set/list/use/new/path`
- `skill-install` / `skill-uninstall`

## 明确不做

- delete、create/link/unlink issue、comment 写操作
- Build API / Upload API（构建上报、符号上传）
- P2 管理域读命令（collaborators / teams / integrations / event data / feature flags）
- 高级 `filter_groups`（OR 逻辑）
- 无界 `--all` 分页
- 替代 Dashboard

## AI 分析拉取链

```bash
# 项目级错误全景
bugsnag-cli --json error-list --project <p> --sort events \
  --filter error.status=open --filter event.since=1d --limit 1000

# 单错误深度分析
bugsnag-cli --json error-latest-event <errorId>
bugsnag-cli --json error-events <errorId> --limit 5 --project <p>
bugsnag-cli --json error-pivots <errorId> --summary-size 5 --project <p>
bugsnag-cli --json error-trend <errorId> --resolution 2h --project <p>

# 项目健康与发布回归
bugsnag-cli --json project-trend --project <p> --buckets-count 30
bugsnag-cli --json project-stability --project <p>
bugsnag-cli --json release-group-list --project <p> --release-stage-name production

# 性能排查
bugsnag-cli --json trace-fields --project <p>
bugsnag-cli --json span-group-list --project <p> --sort duration_p95 --filter span.since=7d
bugsnag-cli --json span-group-show <spanGroupId> --project <p>
bugsnag-cli --json span-group-spans <spanGroupId> --project <p>
```
