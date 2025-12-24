curl -X POST https://https://gymnospermic-mittie-subdepressed.ngrok-free.dev/api/tenant/orders \
  -H "x-instance-token: 99ee1c20-65f7-4dfa-8434-fe7691b6266c" \  
  -H "Content-Type: application/json" \
  -d '{
        "customer": {"phone": "5511999999999"},
        "items": [
            {"product_id": "c6d83b1b-54d2-4bde-85db-0fdc6f194ebe", "quantity": 20}
        ]
  }'

curl -X POST https://gymnospermic-mittie-subdepressed.ngrok-free.dev/api/tenant/payments \
    -H "x-instance-token: 99ee1c20-65f7-4dfa-8434-fe7691b6266c" \
    -H "Content-Type: application/json" \
    -d '{
            "order_id": "3d462deb-3a19-4e20-8cc8-7fe9a0f6877b",
            "payment_method": "card",
            "amount": 1960.00
    }'