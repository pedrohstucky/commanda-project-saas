curl -X POST https://gymnospermic-mittie-subdepressed.ngrok-free.dev/api/tenant/orders \
  -H "x-instance-token: 99ee1c20-65f7-4dfa-8434-fe7691b6266c" \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {"phone": "5511999999999"},
    "items": [{"product_id": "c6d83b1b-54d2-4bde-85db-0fdc6f194ebe", "quantity": 20}]
  }'