# Open Bank Dashboard

A modern, secure dashboard for interacting with Open Banking APIs. This dashboard allows you to connect to your bank accounts, view transactions, and manage your financial data all in one place.

## Features

- Secure authentication using OpenBankProject APIs
- View all connected bank accounts
- Display transaction history
- Filter and search transactions
- Responsive design for desktop and mobile
- Dark and light mode support

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **UI Components**: Kokonut UI component library
- **API Integration**: OpenBankProject API
- **Authentication**: Direct Login
- **Styling**: Tailwind CSS with theming

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- An OpenBankProject API account with consumer key

### Installation

1. Clone the repository:

   ```
   git clone https://github.com/yourusername/open-banking-dashboard.git
   cd open-banking-dashboard
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Create a `.env.local` file with the following configuration:

   ```
   # Client-side API configuration
   NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api

   # Server-side API configuration
   API_BASE_URL=https://apisandbox.openbankproject.com
   OBP_API_VERSION=v5.0.0
   OBP_CONSUMER_KEY=your_consumer_key
   OBP_DIRECT_LOGIN_URL=https://apisandbox.openbankproject.com/my/logins/direct
   ```

4. Start the development server:

   ```
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [OpenBankProject](https://www.openbankproject.com/) for their open banking API
- [Shadcn UI](https://ui.shadcn.com/) for UI component inspiration
