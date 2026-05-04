# Shop API

Base path: `/api/v1`

Authentication uses Bearer access tokens from `POST /auth/login` or
`POST /auth/register`.

## Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

## Products

- `GET /products`
- `GET /products/:productId`
- `POST /products` - `ADMIN`
- `PATCH /products/:productId` - `ADMIN`
- `DELETE /products/:productId` - `ADMIN`
- `GET /products/admin/all` - `ADMIN`

### Product Filtering & Pagination

`GET /products?page=1&limit=10&search=laptop&minPrice=100&maxPrice=2000&sort=createdAt:desc`

Supported query params:
- `page` default `1`
- `limit` default `10`, max `100`
- `search` (matches title/description)
- `categoryId` (applied only if the Product schema has a category field)
- `minPrice`
- `maxPrice`
- `sort` format `field:asc|desc`

Response contains pagination meta:
```json
{
  "success": true,
  "message": "Products fetched.",
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 0
  }
}
```

## Cart

- `GET /cart`
- `POST /cart/items`
- `PATCH /cart/items/:productId`
- `DELETE /cart/items/:productId`
- `DELETE /cart`

## Orders

- `POST /orders`
- `GET /orders`
- `GET /orders/:orderId`
- `GET /orders/admin/all` - `ADMIN`
- `PATCH /orders/admin/:orderId/status` - `ADMIN`
- `PATCH /orders/:orderId/cancel`

### Admin Orders (New)

- `GET /admin/orders` - `ADMIN`
- `GET /admin/orders/:orderId` - `ADMIN`
- `PATCH /admin/orders/:orderId/status` - `ADMIN`

`GET /orders/admin/all?page=1&limit=10&status=PAID&sort=createdAt:desc`  
`GET /admin/orders?page=1&limit=10&status=PAID&sort=createdAt:desc`

Allowed status payload for admin update:
```json
{
  "status": "SHIPPED"
}
```

Allowed values:
- `PENDING`
- `PAID`
- `PROCESSING`
- `SHIPPED`
- `DELIVERED`
- `CANCELLED`

## Payments

- `POST /payments/checkout`
- `POST /payments/webhook`

### Stripe Webhook Testing

1. Create an order from cart using `POST /orders`.
2. Copy the returned `order.id`.
3. Call `POST /payments/checkout` with a valid Bearer token and body:
   - `{ "orderId": "<ORDER_ID>" }`
4. Open the returned `data.url` in a browser and complete payment with Stripe test card `4242 4242 4242 4242`.
5. Run Stripe CLI:
   - `stripe listen --forward-to localhost:5000/api/v1/payments/webhook`
6. Use the Stripe CLI signing secret as `STRIPE_WEBHOOK_SECRET` in `.env`.
7. Only Stripe webhook (`checkout.session.completed`) is trusted to confirm payment.
8. Webhook processing is idempotent by event id. Duplicate Stripe retries return success without double stock/payment writes.
9. After `checkout.session.completed`, the same order is updated to `PAID` and `paidAt` is set.
10. Verify with `GET /orders/<ORDER_ID>`.

## Admin Dashboard

- `GET /admin/dashboard` - `ADMIN`

Returns:
- `totalUsers`
- `totalProducts`
- `totalOrders`
- `totalRevenue`
- `pendingOrders`
- `paidOrders`
- `cancelledOrders`
- `lowStockProducts`
- `recentOrders` (latest 5)
- `recentPayments` (latest 5)

## Postman Examples

### 1) Admin Dashboard
`GET {{BASE_URL}}/api/v1/admin/dashboard`  
Headers: `Authorization: Bearer {{ADMIN_ACCESS_TOKEN}}`

### 2) Admin Orders with Filters
`GET {{BASE_URL}}/api/v1/admin/orders?page=1&limit=10&status=PAID&sort=createdAt:desc`

### 3) Admin Order Status Update
`PATCH {{BASE_URL}}/api/v1/admin/orders/{{ORDER_ID}}/status`  
Body:
```json
{
  "status": "DELIVERED"
}
```

### 4) Product Filtering/Search
`GET {{BASE_URL}}/api/v1/products?page=1&limit=10&search=phone&minPrice=100&maxPrice=1000&sort=price:asc`

### 5) Stripe Checkout
`POST {{BASE_URL}}/api/v1/payments/checkout`  
Body:
```json
{
  "orderId": "{{ORDER_ID}}"
}
```

### 6) Stripe Webhook Notes
- Use Stripe CLI forwarding to `/api/v1/payments/webhook`.
- Keep webhook raw body intact for signature verification.
- Replay events safely to verify idempotency.
