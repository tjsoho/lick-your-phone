# Shopify Integration Setup Guide

This guide will help you set up Shopify integration with your website.

## Prerequisites

1. A Shopify store account
2. Access to your Shopify admin panel

## Step 1: Get Your Shopify Credentials

### Store Domain
1. Go to your Shopify admin panel
2. Your store domain will be in the format: `your-store-name.myshopify.com`

### Storefront Access Token (for public operations)
1. In your Shopify admin, go to **Apps** → **App and sales channel settings**
2. Click **Develop apps** → **Create an app**
3. Name your app (e.g., "Website Integration")
4. Click **Create app**
5. Go to **Configuration** tab
6. Under **Storefront API access**, click **Configure Storefront API access**
7. Check the following scopes:
   - `unauthenticated_read_product_listings`
   - `unauthenticated_read_product_inventory`
   - `unauthenticated_write_checkouts`
   - `unauthenticated_read_checkouts`
8. Click **Save**
9. Click **Install app**
10. Copy the **Storefront access token**

### Admin Access Token (for server-side operations)
1. In the same app configuration
2. Go to **API credentials** tab
3. Click **Generate API credentials**
4. Copy the **Admin API access token**

## Step 2: Configure Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# Shopify Configuration
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=your-store-name.myshopify.com
NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN=your-storefront-access-token
SHOPIFY_ADMIN_ACCESS_TOKEN=your-admin-access-token
SHOPIFY_API_VERSION=2024-01
```

**Important:** Make sure to use the exact variable names above. The `NEXT_PUBLIC_` prefix is required for client-side access in Next.js.

Replace the placeholder values with your actual credentials.

## Step 3: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/products` to see your product list
3. Click on any product to view its details
4. Test adding items to cart and managing the cart

## Features Included

### Product Display
- **Product List**: Displays all products with images, titles, prices, and add-to-cart functionality
- **Product Detail**: Individual product pages with full details, variants, options, and image gallery
- **Responsive Design**: Works on all device sizes

### Cart Management
- **Add to Cart**: Add products with quantity selection
- **Cart Sidebar**: Slide-out cart with item management
- **Update Quantities**: Increase/decrease item quantities
- **Remove Items**: Remove items from cart
- **Cart Persistence**: Cart persists across browser sessions
- **Checkout Integration**: Direct integration with Shopify checkout

### API Integration
- **Storefront API**: For public operations (products, cart)
- **Admin API**: For server-side operations
- **Error Handling**: Comprehensive error handling and loading states
- **Type Safety**: Full TypeScript support

## File Structure

```
src/
├── components/shopify/
│   ├── ProductList.tsx      # Product listing component
│   ├── ProductDetail.tsx    # Individual product page
│   ├── Cart.tsx            # Cart sidebar component
│   └── CartButton.tsx      # Cart button for header
├── contexts/
│   └── CartContext.tsx     # Global cart state management
├── types/
│   └── shopify.ts          # TypeScript type definitions
├── utils/
│   └── shopify.ts          # Shopify API utilities
└── app/
    ├── products/
    │   ├── page.tsx        # Products listing page
    │   └── [handle]/
    │       └── page.tsx    # Individual product page
    └── layout.tsx          # Updated with CartProvider
```

## Customization

### Styling
All components use Tailwind CSS and can be easily customized by modifying the className props.

### Product Display
Modify `ProductList.tsx` to change how products are displayed:
- Grid layout
- Product card design
- Pagination options

### Cart Behavior
Customize cart functionality in `CartContext.tsx`:
- Cart persistence method
- Error handling
- Loading states

## Troubleshooting

### Common Issues

1. **"Store not found" error**
   - Check your `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN` is correct
   - Ensure your store is active

2. **"Invalid access token" error**
   - Verify your access tokens are correct
   - Check token permissions match the required scopes

3. **Products not loading**
   - Ensure your store has products
   - Check that products are published and available

4. **Cart not working**
   - Verify Storefront API permissions
   - Check browser console for errors

### Debug Mode

Enable debug logging by adding this to your `.env.local`:
```env
NODE_ENV=development
```

## Support

For issues with this integration, check:
1. Shopify API documentation
2. Browser console for errors
3. Network tab for failed requests

For Shopify-specific issues, consult Shopify's support documentation.
