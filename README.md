# 🔍 TrialSniffer

A modern Next.js web application for sniffing out insights from Datadog trial organization data in Snowflake.

## Features

- 🔍 **Smart Search & Filter**: Filter trials by Org ID, date range with instant results
- 📊 **Table View**: Modern, sortable table layout with expandable details
- 💎 **shadcn/ui Components**: Beautiful, accessible UI components
- 📱 **Responsive Design**: Works great on desktop and mobile
- 🎨 **Modern Aesthetic**: Gradient backgrounds, smooth animations, polished design
- 🔒 **SSO Authentication**: Secure external browser authentication via Okta
- ⚡ **Fast Performance**: Efficient pagination and data loading
- 📄 **Detailed Insights**: Click any row to view full analysis in a modal

## Prerequisites

- Node.js 18+ installed
- Access to Snowflake with SSO authentication for the `REPORTING.GENERAL.FACT_TRIAL_ANALYSIS` table
- Datadog email address for Snowflake SSO

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Snowflake Credentials**

   The `.env.local` file is already configured for Datadog's Snowflake setup:
   ```env
   SNOWFLAKE_ACCOUNT=sza96462.us-east-1
   SNOWFLAKE_USER=harry.xue@datadoghq.com
   SNOWFLAKE_DATABASE=REPORTING
   SNOWFLAKE_WAREHOUSE=AD_HOC_DEVELOPMENT_XSMALL_WAREHOUSE
   ```

   **Note**: This app uses **external browser authentication** (SSO). When you first start the app and make a query, a browser window will open for you to authenticate via Okta. After authentication, the session will be cached.

3. **Run the Development Server**
   ```bash
   npm run dev
   ```

4. **Authenticate & Open**

   - Start the dev server
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - When you first load data, a browser window will open for Okta/SSO authentication
   - Complete the authentication, then the app will load your data

## Usage

### Viewing Trials

The home page displays trial analyses with:
- Organization ID
- Analysis date
- Trial summary
- Primary value moment (product area)
- Confidence score

### Filtering Data

Use the filter bar to:
- Search by specific Org ID
- Filter by date range (from/to)
- Combine multiple filters

Click **Search** to apply filters or **Reset** to clear them.

### Viewing Details

Click **"Show Details"** on any trial card to see:
- Full primary value moment description
- Supporting evidence
- Areas of focus with detailed actions
- Model and timestamp metadata

### Pagination

Navigate through results using the Previous/Next buttons at the bottom of the page.

## Project Structure

```
trial-analysis-viewer/
├── app/
│   ├── api/
│   │   └── trials/
│   │       └── route.ts      # API endpoint for Snowflake queries
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main page component
├── .env.local                # Your Snowflake credentials (create this)
├── .env.local.example        # Template for credentials
├── next.config.js            # Next.js configuration
├── tailwind.config.ts        # Tailwind CSS configuration
└── package.json              # Dependencies

```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Snowflake (via snowflake-sdk)
- **API**: Next.js API Routes

## Security Notes

- Never commit your `.env.local` file (it's in `.gitignore`)
- This app uses **SSO/external browser authentication** - no passwords are stored
- Authentication tokens are cached by the Snowflake SDK after initial login
- This app is intended for local development/demo use only
- For production use, implement proper authentication and credential management

## API Endpoints

### GET `/api/trials`

Query trial analysis data from Snowflake.

**Query Parameters**:
- `limit` (optional): Number of results per page (default: 20)
- `offset` (optional): Offset for pagination (default: 0)
- `orgId` (optional): Filter by organization ID
- `dateFrom` (optional): Filter by start date (YYYY-MM-DD)
- `dateTo` (optional): Filter by end date (YYYY-MM-DD)

**Response**:
```json
{
  "data": [...],
  "total": 273,
  "limit": 10,
  "offset": 0
}
```

## Troubleshooting

### SSO Authentication Issues

If the browser doesn't open for authentication:
1. Check that your terminal/environment can open browser windows
2. Make sure you're using your `@datadoghq.com` email in `.env.local`
3. If authentication fails, check that you have access to Snowflake via Okta
4. Try clearing Snowflake's cached credentials at `~/.snowflake/`

### Connection Issues

If you get Snowflake connection errors:
1. Verify your user email in `.env.local` is correct (`your.name@datadoghq.com`)
2. Check that your account identifier is `sza96462.us-east-1`
3. Ensure your user has access to the `REPORTING.GENERAL.FACT_TRIAL_ANALYSIS` table
4. Verify the warehouse name is `AD_HOC_DEVELOPMENT_XSMALL_WAREHOUSE`
5. Check the dev server console for detailed error messages

### Module Not Found Errors

If you see module errors, try:
```bash
rm -rf node_modules .next
npm install
npm run dev
```

## Development

To build for production:
```bash
npm run build
npm start
```

To run linting:
```bash
npm run lint
```

## License

ISC
