require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function run() {
    try {
        // Connect to MongoDB
        await client.connect();
        console.log("Connected to MongoDB");

        const db = client.db('gents-livery');
        const productCollection = db.collection('products');

        // Get all products
        app.get('/products', async (req, res) => {
            let query = {};
            let sort = {};
            console.log(req.query);
            if (req.query.category) {
                query.category = req.query.category;
            }

            if (req.query.rating) {
                query['ratings.value'] = { $eq: parseInt(req.query.rating) };
            }

            if (req.query.priceRange) {
                const [minPrice, maxPrice] = req.query.priceRange.split('-').map(Number);
                query['price.originalPrice'] = {};
                query['price.originalPrice'].$gte = minPrice;
                query['price.originalPrice'].$lte = maxPrice;
                sort['price.originalPrice'] = 1;
            }

            const products = await productCollection.find(query).sort(sort).toArray();
            res.status(200).json({ success: true, data: products });
        });

        // Get a single product
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const result = await productCollection.findOne({ _id: new ObjectId(id) });
            res.send(result);
        });

        // Get all flash sales
        app.get('/flash-sales', async (req, res) => {
            const flashSales = await productCollection.find({ 'flashSale': true }).toArray();
            res.status(200).json({ success: true, data: flashSales });
        });

        // Get all trending products
        app.get('/trending', async (req, res) => {
            const trendingProducts = await productCollection.find().sort({ 'ratings.value': -1 }).toArray();
            res.status(200).json({ success: true, data: trendingProducts });
        });

        // Category Statistics
        app.get('/category-stats', async (req, res) => {
            const pipeline = [
                {
                    $group: {
                        _id: '$category',
                        count: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        name: '$_id',
                        count: 1,
                        _id: 0
                    }
                }
            ];
            const categoryStats = await productCollection.aggregate(pipeline).toArray();
            res.status(200).json({ success: true, data: categoryStats });
        });

        // Start the server
        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });

    } finally {
    }
}

run().catch(console.dir);

// Test route
app.get('/', (req, res) => {
    const serverStatus = {
        message: 'Server is running smoothly',
        timestamp: new Date()
    };
    res.json(serverStatus);
});