const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Parser } = require('json2csv');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 7000;

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// MongoDB Connection with better error handling
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/student-registration', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB successfully');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1);
    }
};

connectDB();

// Student Query Schema
const studentQuerySchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters long']
    },
    className: {
        type: String,
        required: [true, 'Class is required'],
        trim: true,
        enum: ['5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th', 'Other']
    },
    city: {
        type: String,
        required: [true, 'City is required'],
        trim: true,
        minlength: [2, 'City must be at least 2 characters long']
    },
    state: {
        type: String,
        required: [true, 'State is required'],
        trim: true,
        minlength: [2, 'State must be at least 2 characters long']
    },
    phoneNumber: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        match: [/^[\d\s\-\+\(\)]{7,16}$/, 'Please enter a valid phone number']
    },
    question: {
        type: String,
        trim: true,
        maxlength: [500, 'Question cannot exceed 500 characters']
    },
    submittedAt: {
        type: Date,
        default: Date.now
    }
});

const StudentQuery = mongoose.model('StudentQuery', studentQuerySchema);

// Admin Authentication Middleware
const authenticateAdmin = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Access denied. No token provided.' 
        });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        req.admin = decoded;
        next();
    } catch (error) {
        res.status(401).json({ 
            success: false, 
            message: 'Invalid token.' 
        });
    }
};

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/admin', (req, res) => {
    res.render('admin');
});

// Admin Login API
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Validate input
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }
        
        // Check admin credentials
        const adminUsername = process.env.ADMIN_USERNAME || 'admin';
        const adminPassword = process.env.ADMIN_PASSWORD || 'igniteu2025';
        
        if (username !== adminUsername || password !== adminPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { username, role: 'admin' },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            message: 'Login successful',
            token,
            admin: { username, role: 'admin' }
        });
        
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred during login'
        });
    }
});

// Verify Admin Token API
app.get('/api/admin/verify', authenticateAdmin, (req, res) => {
    res.json({
        success: true,
        message: 'Token is valid',
        admin: req.admin
    });
});

// API Routes
app.post('/api/submit-query', async (req, res) => {
    try {
        const { fullName, className, city, state, phoneNumber, question } = req.body;
        
        // Validation
        if (!fullName || !className || !city || !state || !phoneNumber) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please fill in all required fields' 
            });
        }

        // Create new student query
        const newQuery = new StudentQuery({
            fullName,
            className,
            city,
            state,
            phoneNumber,
            question: question || ''
        });

        await newQuery.save();
        
        res.status(201).json({ 
            success: true, 
            message: 'Your registration has been submitted successfully!' 
        });
    } catch (error) {
        console.error('Error submitting query:', error);
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred while submitting your registration' 
        });
    }
});

// Protected Admin APIs
app.get('/api/queries', authenticateAdmin, async (req, res) => {
    try {
        const queries = await StudentQuery.find().sort({ submittedAt: -1 });
        res.json({ success: true, data: queries });
    } catch (error) {
        console.error('Error fetching queries:', error);
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred while fetching registrations' 
        });
    }
});

app.delete('/api/queries/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid registration ID'
            });
        }

        const deletedQuery = await StudentQuery.findByIdAndDelete(id);
        
        if (!deletedQuery) {
            return res.status(404).json({
                success: false,
                message: 'Registration not found'
            });
        }

        res.json({
            success: true,
            message: 'Registration deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting query:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while deleting the registration'
        });
    }
});

// Get registration statistics (for admin dashboard)
app.get('/api/stats', authenticateAdmin, async (req, res) => {
    try {
        const totalRegistrations = await StudentQuery.countDocuments();
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayRegistrations = await StudentQuery.countDocuments({
            submittedAt: { $gte: today }
        });
        
        const classStats = await StudentQuery.aggregate([
            {
                $group: {
                    _id: '$className',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);
        
        res.json({
            success: true,
            data: {
                totalRegistrations,
                todayRegistrations,
                classStats
            }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while fetching statistics'
        });
    }
});

// Export registrations as CSV (admin only)
app.get('/api/queries/export/csv', authenticateAdmin, async (req, res) => {
    try {
        const queries = await StudentQuery.find().sort({ submittedAt: -1 }).lean();
        if (!queries.length) {
            return res.status(404).json({ success: false, message: 'No registrations found' });
        }
        // Prepare fields for CSV
        const fields = [
            { label: 'Full Name', value: 'fullName' },
            { label: 'Class', value: 'className' },
            { label: 'City', value: 'city' },
            { label: 'State', value: 'state' },
            { label: 'Phone Number', value: 'phoneNumber' },
            { label: 'Question', value: 'question' },
            { label: 'Submitted At', value: row => new Date(row.submittedAt).toLocaleString() }
        ];
        const parser = new Parser({ fields });
        const csv = parser.parse(queries);
        res.header('Content-Type', 'text/csv');
        res.attachment('registrations.csv');
        return res.send(csv);
    } catch (error) {
        console.error('Error exporting CSV:', error);
        res.status(500).json({ success: false, message: 'Failed to export CSV' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📝 Visit http://localhost:${PORT} to view the registration form`);
    console.log(`🔐 Visit http://localhost:${PORT}/admin to view the admin dashboard`);
    console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}`);
}); 