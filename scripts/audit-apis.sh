#!/bin/bash

echo "📊 API ENDPOINTS AUDIT"
echo "===================="
echo ""

find apps/web/app/api -type f -name "route.ts" | sort | while read file; do
  endpoint=$(echo "$file" | sed 's|apps/web/app/api/||' | sed 's|/route.ts||')
  
  # Check which methods are supported
  methods=""
  grep -q "export async function GET" "$file" && methods="${methods}GET "
  grep -q "export async function POST" "$file" && methods="${methods}POST "
  grep -q "export async function PUT" "$file" && methods="${methods}PUT "
  grep -q "export async function PATCH" "$file" && methods="${methods}PATCH "
  grep -q "export async function DELETE" "$file" && methods="${methods}DELETE "
  grep -q "export async function HEAD" "$file" && methods="${methods}HEAD "
  
  echo "/api/$endpoint"
  echo "  Methods: $methods"
  echo ""
done
