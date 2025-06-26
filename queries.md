## Delete duplicates
```sql
DELETE FROM bottles
WHERE id NOT IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC) AS rn
    FROM bottles
  ) t
  WHERE t.rn = 1
);
```

## Add bottle
```sql
insert into bottles (name, brand, category, subcategory, abv, volume_ml) values
  ('Soda Water', 'Generic', 'Mixers', 'Carbonated Water', 0.0, 1000);
```