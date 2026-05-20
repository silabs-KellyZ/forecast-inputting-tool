# Forecast Inputting Tool

This prototype models a forecast input workflow with scoped user access, row-level version control, audit history, and summed forecast totals.

## Current Prototype

- `index.html` contains the page structure.
- `styles.css` contains the page styling.
- `script.js` contains the current browser-only app logic.
- Forecast rows, users, versions, and change history are simulated with `localStorage`.

## Production Flow

1. Business user signs in through company authentication.
2. Backend resolves the user's role and data scope.
3. Frontend requests forecast rows from an API.
4. Backend reads from the data warehouse and returns only rows the user can access.
5. User edits allowed forecast/comment fields.
6. Frontend submits changed fields with the row's current version.
7. Backend checks access and version inside one transaction.
8. Backend writes detail changes, inserts audit history, recalculates forecast totals, and updates the target warehouse table.
9. Frontend refreshes from the latest committed data.

## Suggested Tables

`forecast_input`

- `row_id`
- `business_unit`
- `region`
- `product`
- `month`
- `forecast_value`
- `comment`
- `version`
- `last_updated_by`
- `last_updated_at`

`forecast_change_history`

- `change_id`
- `row_id`
- `column_name`
- `old_value`
- `new_value`
- `from_version`
- `to_version`
- `updated_by`
- `updated_at`

`user_data_access`

- `user_id`
- `role`
- `business_unit`
- `region`
- `can_edit`

`forecast_summary`

- `business_unit`
- `region`
- `month`
- `total_forecast`
- `last_calculated_at`

## Version Control Rule

When saving a row, the backend should update only when the submitted version still matches the warehouse version:

```sql
UPDATE forecast_input
SET forecast_value = :forecast_value,
    comment = :comment,
    version = version + 1,
    last_updated_by = :user_id,
    last_updated_at = CURRENT_TIMESTAMP
WHERE row_id = :row_id
  AND version = :submitted_version;
```

If zero rows are updated, return a conflict response and ask the user to refresh.

## Security Note

The browser can show or hide rows for a better user experience, but the backend must enforce all access rules before reading or writing warehouse data.
