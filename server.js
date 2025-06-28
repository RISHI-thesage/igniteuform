const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/student-registration', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Student Query Schema
const studentQuerySchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    className: {
        type: String,
        required: true,
        trim: true
    },
    city: {
        type: String,
        required: true,
        trim: true
    },
    state: {
        type: String,
        required: true,
        trim: true
    },
    phoneNumber: {
        type: String,
        required: true,
        trim: true
    },
    question: {
        type: String,
        trim: true
    },
    submittedAt: {
        type: Date,
        default: Date.now
    }
});

const StudentQuery = mongoose.model('StudentQuery', studentQuerySchema);

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
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
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred while submitting your registration' 
        });
    }
});

// Get all queries (for admin dashboard)
app.get('/api/queries', async (req, res) => {
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

// Delete a specific query
app.delete('/api/queries/:id', async (req, res) => {
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

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to view the application`);
    console.log(`Visit http://localhost:${PORT}/admin to view the admin dashboard`);
}); 