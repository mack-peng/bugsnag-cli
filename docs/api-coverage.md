# bugsnag-cli API Coverage (v0.2)

Source: SwaggerHub `smartbear-public/bugsnag-data-access-api` v2 (OpenAPI 3.0.3, 141 operations, modified 2026-03-24).

Live drift (2026-10-29): error and project trends use singular `/trend`; the plural `/trends` path returns 404. Performance endpoints accept event-style filters (`filters[field][][type]`), not `PerformanceFilter[]`.

Legend: `EXISTING` = already implemented in v0.1.2; `P0-READ` / `P0-WRITE` / `P1-READ` = planned for v0.2; `P2-READ` = documented but not in v0.2; `EXCLUDED-WRITE` = write operations intentionally out of scope.

| Status | Count |
|---|---:|
| EXISTING | 12 |
| P0-READ | 12 |
| P0-WRITE | 2 |
| P1-READ | 16 |
| P2-READ | 38 |
| EXCLUDED-WRITE | 61 |
| **Total** | **141** |

| Status | Method | Path | Command | Summary |
|---|---|---|---|---|
| EXISTING | GET | `/errors/{error_id}/latest_event` | `error-latest-event` | View the latest Event on an Error |
| EXISTING | GET | `/organizations/{organization_id}/projects` | `project-list` | List an Organization's Projects |
| EXISTING | GET | `/projects/{project_id}` | `project-show` | View a Project |
| EXISTING | GET | `/projects/{project_id}/errors` | `error-list` | List the Errors on a Project |
| EXISTING | GET | `/projects/{project_id}/errors/{error_id}` | `error-show` | View an Error |
| EXISTING | GET | `/projects/{project_id}/errors/{error_id}/events` | `error-events` | List the Events on an Error |
| EXISTING | GET | `/projects/{project_id}/errors/{error_id}/pivots` | `error-pivots` | List Pivots on an Error |
| EXISTING | GET | `/projects/{project_id}/errors/{error_id}/pivots/{event_field_display_id}/values` | `error-pivot-values` | List values of a Pivot on an Error |
| EXISTING | GET | `/projects/{project_id}/errors/{error_id}/trends` | `error-trend` (live: `/trend`) | List the Trends for an Error |
| EXISTING | GET | `/projects/{project_id}/event_fields` | `event-fields` | List the Event Fields for a Project |
| EXISTING | GET | `/projects/{project_id}/events/{event_id}` | `event-show` | View an Event |
| EXISTING | GET | `/user/organizations` | `org-list` | List the Current User's Organizations |
| P0-READ | GET | `/projects/{project_id}/errors/{error_id}/comments` | `comment-list` | List Comments on an Error |
| P0-READ | GET | `/projects/{project_id}/events` | `event-list` | List the Events on a Project |
| P0-READ | GET | `/projects/{project_id}/pivots` | `project-pivots` | List Pivots on a Project |
| P0-READ | GET | `/projects/{project_id}/pivots/{event_field_display_id}/values` | `project-pivot-values` | List values of a Pivot on a Project |
| P0-READ | GET | `/projects/{project_id}/release_groups` | `release-group-list` | List Release Groups on a Project |
| P0-READ | GET | `/projects/{project_id}/releases` | `release-list` | List Releases on a Project |
| P0-READ | GET | `/projects/{project_id}/releases/{release_id}` | `release-show` | View a Release |
| P0-READ | GET | `/projects/{project_id}/saved_searches` | `saved-search-list` | List Saved Searches on a Project |
| P0-READ | GET | `/projects/{project_id}/stability_trend` | `project-stability` | View the stability trend for a project |
| P0-READ | GET | `/projects/{project_id}/trends` | `project-trend` (live: `/trend`) | List the Trends for a Project |
| P0-READ | GET | `/release_groups/{id}` | `release-group-show` | Retrieve a Release Group |
| P0-READ | GET | `/saved_searches/{id}` | `saved-search-show` | Get a Saved Search |
| P0-WRITE | PATCH | `/projects/{project_id}/errors` | `error-bulk-update` | Bulk Update Errors |
| P0-WRITE | PATCH | `/projects/{project_id}/errors/{error_id}` | `error-update` | Update an Error |
| P1-READ | GET | `/organizations/{organization_id}/traces/{trace_id}/spans` | `org-trace-spans` | List Spans for a Trace |
| P1-READ | GET | `/projects/{project_id}/network_endpoint_grouping` | `network-grouping-show` | List a Project's Network Grouping Ruleset |
| P1-READ | GET | `/projects/{project_id}/page_load_span_groups` | `page-load-span-group-list` | List Page Load Span Groups |
| P1-READ | GET | `/projects/{project_id}/page_load_span_groups/{id}` | `page-load-span-group-show` | Show a Page Load Span Group by ID |
| P1-READ | GET | `/projects/{project_id}/performance_overview` | `performance-overview` | Get Performance Score Overview for Project |
| P1-READ | GET | `/projects/{project_id}/span_group_categories/{category}/span_groups/{name}/spans` | `span-group-spans-by-name` | Get Spans for a Span Group |
| P1-READ | GET | `/projects/{project_id}/span_group_summaries` | `span-group-summaries` | List Span Group Summaries for a Project |
| P1-READ | GET | `/projects/{project_id}/span_groups` | `span-group-list` | List Span Groups on a Project |
| P1-READ | GET | `/projects/{project_id}/span_groups/{id}` | `span-group-show` | Show a Span Group |
| P1-READ | GET | `/projects/{project_id}/span_groups/{id}/distribution` | `span-group-distribution` | Get a Span Group's distribution |
| P1-READ | GET | `/projects/{project_id}/span_groups/{id}/performance_targets` | `span-group-performance-targets` | List Performance Targets for a Span Group by ID |
| P1-READ | GET | `/projects/{project_id}/span_groups/{id}/spans` | `span-group-spans` | List Spans for a Span Group by ID |
| P1-READ | GET | `/projects/{project_id}/span_groups/{id}/timeline` | `span-group-timeline` | Get a Span Group's timeline |
| P1-READ | GET | `/projects/{project_id}/starred_span_groups` | `starred-span-group-list` | List the starred Span Group descriptions |
| P1-READ | GET | `/projects/{project_id}/trace_fields` | `trace-fields` | List the Trace Fields on a project |
| P1-READ | GET | `/projects/{project_id}/traces/{trace_id}/spans` | `trace-spans` | List Spans for a Trace |
| P2-READ | GET | `/configured_integrations/{id}` | — | Get a Configured Integration |
| P2-READ | GET | `/integrations` | — | List the supported Integrations |
| P2-READ | GET | `/organizations/{id}` | — | View an Organization |
| P2-READ | GET | `/organizations/{organization_id}/collaborators` | — | List all collaborators that are members of your organization |
| P2-READ | GET | `/organizations/{organization_id}/collaborators/project_access_counts` | — | View the project count of a collaborator |
| P2-READ | GET | `/organizations/{organization_id}/collaborators/{collaborator_id}/project_accesses` | — | List project accesses for a collaborator |
| P2-READ | GET | `/organizations/{organization_id}/collaborators/{collaborator_id}/project_accesses/{project_id}` | — | Show a Collaborator's Access Details for a Project |
| P2-READ | GET | `/organizations/{organization_id}/collaborators/{collaborator_id}/projects` | — | View Projects a Collaborator has access to |
| P2-READ | GET | `/organizations/{organization_id}/collaborators/{id}` | — | Show a Collaborator on an Organization |
| P2-READ | GET | `/organizations/{organization_id}/collaborators/{id}/suggested_teams` | — | List Suggested Teams for a Collaborator |
| P2-READ | GET | `/organizations/{organization_id}/collaborators/{id}/teams` | — | List Teams for a Collaborator |
| P2-READ | GET | `/organizations/{organization_id}/event_data_deletions/{id}` | — | Check the status of an event deletion request |
| P2-READ | GET | `/organizations/{organization_id}/event_data_requests/{id}` | — | Check the status of an event data request |
| P2-READ | GET | `/organizations/{organization_id}/integration_connections` | — | List the Integration Connections for an Organization |
| P2-READ | GET | `/organizations/{organization_id}/scim/v2/Groups` | — | List Groups on an Organization |
| P2-READ | GET | `/organizations/{organization_id}/scim/v2/Groups/{id}` | — | Show Group on an Organization |
| P2-READ | GET | `/organizations/{organization_id}/scim/v2/Users` | — | List Collaborators on an Organization |
| P2-READ | GET | `/organizations/{organization_id}/scim/v2/Users/{id}` | — | Show a Collaborator on an Organization |
| P2-READ | GET | `/organizations/{organization_id}/teams` | — | List Teams from a query |
| P2-READ | GET | `/organizations/{organization_id}/teams/{id}` | — | Show the details of a team |
| P2-READ | GET | `/organizations/{organization_id}/teams/{id}/collaborators` | — | List the Collaborators in a Team |
| P2-READ | GET | `/organizations/{organization_id}/teams/{id}/project_accesses` | — | List Project Access for a Team |
| P2-READ | GET | `/organizations/{organization_id}/teams/{id}/suggested_collaborators` | — | List Suggested Collaborators to Add to a Team |
| P2-READ | GET | `/organizations/{organization_id}/teams/{id}/suggested_projects` | — | Suggest Projects to Add to a Team |
| P2-READ | GET | `/projects/{project_id}/collaborators` | — | List Collaborators on a Project |
| P2-READ | GET | `/projects/{project_id}/collaborators/{id}` | — | Show a collaborator in a project. |
| P2-READ | GET | `/projects/{project_id}/configured_integration_summaries` | — | List Summaries of the Configured Integrations for a Project |
| P2-READ | GET | `/projects/{project_id}/event_data_deletions/{id}` | — | Check the status of an event deletion request |
| P2-READ | GET | `/projects/{project_id}/event_data_requests/{id}` | — | Check the status of an event data request |
| P2-READ | GET | `/projects/{project_id}/feature_flag_summaries` | — | List Feature Flag Summaries for a Project |
| P2-READ | GET | `/projects/{project_id}/feature_flags` | — | List Feature Flags on a Project |
| P2-READ | GET | `/projects/{project_id}/feature_flags/by_name/{name}/variants` | — | List Variants on a Feature Flag by name |
| P2-READ | GET | `/projects/{project_id}/feature_flags/{id}` | — | Get a Feature Flag |
| P2-READ | GET | `/projects/{project_id}/feature_flags/{id}/error_overview` | — | Get a Feature Flag's Error Overview |
| P2-READ | GET | `/projects/{project_id}/feature_flags/{id}/variants` | — | List Variants on a Feature Flag by ID |
| P2-READ | GET | `/projects/{project_id}/feature_flags/{id}/variants/error_overview` | — | Get a Feature Flag Variant's Error Overview |
| P2-READ | GET | `/release_groups/{release_group_id}/releases` | — | List Releases on a Release Group |
| P2-READ | GET | `/saved_searches/{id}/usage_summary` | — | Get the Usage Summary for a Saved Search |
| EXCLUDED-WRITE | DELETE | `/comments/{comment_id}` | — | Delete a Comment |
| EXCLUDED-WRITE | PATCH | `/comments/{comment_id}` | — | Update a Comment |
| EXCLUDED-WRITE | DELETE | `/configured_integrations/{id}` | — | Delete a Configured Integration |
| EXCLUDED-WRITE | PATCH | `/configured_integrations/{id}` | — | Update a Configured Integration |
| EXCLUDED-WRITE | POST | `/configured_integrations/{id}/test` | — | Test a Configured Integration |
| EXCLUDED-WRITE | PATCH | `/configured_integrations/{id}/trigger_configs/{trigger_config_key}` | — | Update a Configured Integration's Trigger Config |
| EXCLUDED-WRITE | POST | `/integrations/test` | — | Test an Integration |
| EXCLUDED-WRITE | POST | `/organizations` | — | Create an Organization |
| EXCLUDED-WRITE | DELETE | `/organizations/{id}` | — | Delete an Organization |
| EXCLUDED-WRITE | PATCH | `/organizations/{id}` | — | Update an Organization |
| EXCLUDED-WRITE | DELETE | `/organizations/{id}/api_key` | — | Regenerate an Organization's API key |
| EXCLUDED-WRITE | DELETE | `/organizations/{id}/auth_token` | — | Regenerate an Organization's auth token |
| EXCLUDED-WRITE | POST | `/organizations/{organization_id}/collaborators` | — | Invite a collaborator to your organization |
| EXCLUDED-WRITE | POST | `/organizations/{organization_id}/collaborators/bulk_invite` | — | Bulk invite collaborators to your organization |
| EXCLUDED-WRITE | DELETE | `/organizations/{organization_id}/collaborators/{id}` | — | Delete a Collaborator |
| EXCLUDED-WRITE | PATCH | `/organizations/{organization_id}/collaborators/{id}` | — | Update a Collaborator's permissions |
| EXCLUDED-WRITE | DELETE | `/organizations/{organization_id}/collaborators/{id}/team_memberships` | — | Remove a Collaborator from a group of Teams |
| EXCLUDED-WRITE | POST | `/organizations/{organization_id}/collaborators/{id}/team_memberships` | — | Add a collaborator to a group of Teams |
| EXCLUDED-WRITE | POST | `/organizations/{organization_id}/event_data_deletions` | — | Create an event deletion request |
| EXCLUDED-WRITE | POST | `/organizations/{organization_id}/event_data_deletions/{id}/confirm` | — | Confirm an event deletion request |
| EXCLUDED-WRITE | POST | `/organizations/{organization_id}/event_data_requests` | — | Create an event data request |
| EXCLUDED-WRITE | POST | `/organizations/{organization_id}/projects` | — | Create a Project in an Organization |
| EXCLUDED-WRITE | POST | `/organizations/{organization_id}/scim/v2/Groups` | — | Create Group on an Organization |
| EXCLUDED-WRITE | DELETE | `/organizations/{organization_id}/scim/v2/Groups/{id}` | — | Delete Group on an Organization |
| EXCLUDED-WRITE | PATCH | `/organizations/{organization_id}/scim/v2/Groups/{id}` | — | Update Group on an Organization |
| EXCLUDED-WRITE | POST | `/organizations/{organization_id}/scim/v2/Users` | — | Create a Collaborator |
| EXCLUDED-WRITE | DELETE | `/organizations/{organization_id}/scim/v2/Users/{id}` | — | Remove a Collaborator |
| EXCLUDED-WRITE | PATCH | `/organizations/{organization_id}/scim/v2/Users/{id}` | — | Add or Remove Previously Added Collaborators |
| EXCLUDED-WRITE | PUT | `/organizations/{organization_id}/scim/v2/Users/{id}` | — | Update a Collaborator |
| EXCLUDED-WRITE | POST | `/organizations/{organization_id}/teams` | — | Create a Team |
| EXCLUDED-WRITE | DELETE | `/organizations/{organization_id}/teams/{id}` | — | Delete a team |
| EXCLUDED-WRITE | PATCH | `/organizations/{organization_id}/teams/{id}` | — | Update a team name |
| EXCLUDED-WRITE | DELETE | `/organizations/{organization_id}/teams/{id}/project_accesses` | — | Remove Project Access from a Team |
| EXCLUDED-WRITE | PATCH | `/organizations/{organization_id}/teams/{id}/project_accesses` | — | Add Project Access to a Team |
| EXCLUDED-WRITE | DELETE | `/organizations/{organization_id}/teams/{id}/team_memberships` | — | Remove Collaborators from a Team |
| EXCLUDED-WRITE | POST | `/organizations/{organization_id}/teams/{id}/team_memberships` | — | Add Collaborators to a Team |
| EXCLUDED-WRITE | DELETE | `/projects/{project_id}` | — | Delete a Project |
| EXCLUDED-WRITE | PATCH | `/projects/{project_id}` | — | Update a Project |
| EXCLUDED-WRITE | DELETE | `/projects/{project_id}/api_key` | — | Regenerate a Project's notifier API key |
| EXCLUDED-WRITE | POST | `/projects/{project_id}/configured_integrations` | — | Configure an Integration |
| EXCLUDED-WRITE | PUT | `/projects/{project_id}/error_assignment_rules` | — | Replace the ErrorAssignmentRules on a project |
| EXCLUDED-WRITE | DELETE | `/projects/{project_id}/errors` | — | Delete all Errors in a Project |
| EXCLUDED-WRITE | DELETE | `/projects/{project_id}/errors/{error_id}` | — | Delete an Error |
| EXCLUDED-WRITE | POST | `/projects/{project_id}/errors/{error_id}/comments` | — | Create a Comment on an Error |
| EXCLUDED-WRITE | POST | `/projects/{project_id}/event_data_deletions` | — | Create an event deletion request |
| EXCLUDED-WRITE | POST | `/projects/{project_id}/event_data_deletions/{id}/confirm` | — | Confirm an event deletion request |
| EXCLUDED-WRITE | POST | `/projects/{project_id}/event_data_requests` | — | Create an event data request |
| EXCLUDED-WRITE | POST | `/projects/{project_id}/event_fields` | — | Create a custom Event Field |
| EXCLUDED-WRITE | DELETE | `/projects/{project_id}/event_fields/{display_id}` | — | Delete a custom Event Field |
| EXCLUDED-WRITE | PATCH | `/projects/{project_id}/event_fields/{display_id}` | — | Update a custom Event Field |
| EXCLUDED-WRITE | DELETE | `/projects/{project_id}/events/{event_id}` | — | Delete an Event |
| EXCLUDED-WRITE | DELETE | `/projects/{project_id}/feature_flags/{id}` | — | Delete a Feature Flag |
| EXCLUDED-WRITE | PUT | `/projects/{project_id}/network_endpoint_grouping` | — | Update a Project's Network Grouping Ruleset |
| EXCLUDED-WRITE | PATCH | `/projects/{project_id}/span_groups/{id}` | — | Update Span Group |
| EXCLUDED-WRITE | DELETE | `/projects/{project_id}/upload_api_key` | — | Regenerate a Project's upload API key |
| EXCLUDED-WRITE | PATCH | `/release_groups/{id}` | — | Update a Release Group |
| EXCLUDED-WRITE | POST | `/saved_searches` | — | Create a Saved Search |
| EXCLUDED-WRITE | DELETE | `/saved_searches/{id}` | — | Delete a Saved Search |
| EXCLUDED-WRITE | PATCH | `/saved_searches/{id}` | — | Update a Saved Search |
| EXCLUDED-WRITE | POST | `/user/projects/{project_id}/starred_feature_flags` | — | Star a Feature Flag |
| EXCLUDED-WRITE | DELETE | `/user/projects/{project_id}/starred_feature_flags/{id}` | — | Unstar a Feature Flag |
