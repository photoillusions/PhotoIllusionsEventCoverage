// Load environment variables FIRST
require('dotenv').config();

const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const bodyParser = require('body-parser');
const path = require('path');

// Validate that Stripe key is loaded
if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ ERROR: STRIPE_SECRET_KEY is not set in .env file');
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from public directory
app.use(express.static('public'));

// Root route - serves EventCoverage.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'EventCoverage.html'));
});

// Create payment intent endpoint
app.post('/create-payment-intent', async (req, res) => {
    try {
        const { 
            amount, 
            name, 
            email, 
            phone, 
            eventTitle, 
            venueName,
            eventDate,
            startTime,
            endTime,
            location,
            notes,
            totalPackagePrice,
            remainingBalance
        } = req.body;

        // Validate amount
        if (amount < 500) { // $5.00 minimum in cents
            return res.status(400).json({ 
                error: 'Minimum payment amount is $5.00' 
            });
        }

        if (amount > 65000) { // $650.00 maximum in cents
            return res.status(400).json({ 
                error: 'Payment amount exceeds package price' 
            });
        }

        // Create payment intent with Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'usd',
            metadata: {
                customer_name: name,
                customer_email: email,
                customer_phone: phone,
                event_title: eventTitle,
                venue_name: venueName,
                event_date: eventDate,
                event_times: `${startTime} - ${endTime}`,
                event_location: location,
                notes: notes || 'None',
                package_total: `$${(totalPackagePrice / 100).toFixed(2)}`,
                payment_amount: `$${(amount / 100).toFixed(2)}`,
                remaining_balance: `$${(remainingBalance / 100).toFixed(2)}`
            },
            receipt_email: email,
            description: `Event Coverage Package - ${eventTitle} at ${venueName}`
        });

        // Log successful payment intent creation (for your records)
        console.log(`✅ Payment intent created: ${paymentIntent.id} for ${email}`);

        // Send back the client secret
        res.json({
            clientSecret: paymentIntent.client_secret
        });

    } catch (error) {
        console.error('❌ Error creating payment intent:', error);
        res.status(500).json({ 
            error: 'Failed to create payment intent. Please try again.' 
        });
    }
});

// Thank you page
app.get('/thank-you.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'thank-you.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
    console.log('🚀 Photo Illusions Event Coverage Server');
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📱 Local: http://localhost:${PORT}`);
    console.log(`🔑 Stripe mode: ${process.env.STRIPE_SECRET_KEY.startsWith('sk_test') ? 'TEST' : 'LIVE'}`);
});