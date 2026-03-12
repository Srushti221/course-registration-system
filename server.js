const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const mongoose = require("mongoose");
const path = require("path");
const bcrypt = require("bcryptjs");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || "mongodb+srv://srushtibandi22_db_user:7337728790@cluster0.hpf6ozj.mongodb.net/student-course-registration?retryWrites=true&w=majority");

const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));

db.once("open", function () {
    console.log("MongoDB connected successfully!");
});

// Define schemas and models
const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    registeredCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }]
});

const courseSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    credits: { type: Number, required: true },
    instructor: { type: String, required: true },
    schedule: { type: String, required: true },
    capacity: { type: Number, required: true },
    enrolled: { type: Number, default: 0 }
});

const User = mongoose.model("User", userSchema);
const Course = mongoose.model("Course", courseSchema);

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Seed initial courses (run once)
async function seedCourses() {
    const count = await Course.countDocuments();
    if (count === 0) {
        const courses = [
{
    code: "24ECAC305",
    title: "Deep Learning",
    description: "Concepts of neural networks, deep learning architectures and applications",
    credits: 3,
    instructor: "Dr. Salma Shahapur",
    schedule: "Mon 09:00-10:00",
    capacity: 50
},
{
    code: "24ECAC306",
    title: "Embedded Intelligent Systems",
    description: "Design and implementation of intelligent embedded systems",
    credits: 3,
    instructor: "Dr. Prema T. Akkasaligar",
    schedule: "Thu 09:00-10:00",
    capacity: 50
},
{
    code: "24ECAC307",
    title: "Natural Language Processing & Gen AI",
    description: "Text processing, language models, and generative AI techniques",
    credits: 3,
    instructor: "Ms. Savita Bagewadi",
    schedule: "Mon 10:00-11:00",
    capacity: 50
},
{
    code: "24ECAE317",
    title: "Cloud Computing",
    description: "Fundamentals of cloud architecture, services, and deployment models",
    credits: 3,
    instructor: "Miss. Madhurani S",
    schedule: "Mon 11:30-12:30",
    capacity: 50
},
{
    code: "23ECAE335",
    title: "DevOps and MLOps",
    description: "Tools and practices for continuous integration, deployment, and ML operations",
    credits: 3,
    instructor: "Mrs. Tabassum J",
    schedule: "Thu 10:00-11:00",
    capacity: 40
},
{
    code: "24ECAW304",
    title: "Minor Project",
    description: "Project work applying learned concepts to real-world problems",
    credits: 4,
    instructor: "Mr. Amey M",
    schedule: "Tue 02:30-04:30",
    capacity: 30
},
{
    code: "16EHSC301",
    title: "Professional Aptitude & Logical Reasoning",
    description: "Training in aptitude, logical reasoning, and problem solving",
    credits: 2,
    instructor: "Mrs. Priyanka Patil",
    schedule: "Wed 10:15-12:15",
    capacity: 60
},
{
    code: "24ECS320",
    title: "Applied Computational Medicine",
    description: "Application of computing techniques in medical data analysis",
    credits: 3,
    instructor: "Dr. Santosh Pattar",
    schedule: "Thu 01:30-03:30",
    capacity: 40
}
];

        await Course.insertMany(courses);
        console.log("Courses seeded successfully!");
    }
}

// Routes
app.get("/", (req, res) => res.redirect("/login"));

// Registration routes
app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "register.html"));
});

app.post("/register", async (req, res) => {
    const { username, email, phone, password, confirmPassword } = req.body;
    
    if (password !== confirmPassword) {
        return res.status(400).json({ error: "Passwords do not match" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = new User({
            username,
            email,
            phone,
            password: hashedPassword
        });

        await newUser.save();
        res.status(201).json({ message: "Registration successful" });
    } catch (err) {
        if (err.code === 11000) {
            res.status(400).json({ error: "Email already exists" });
        } else {
            console.error(err);
            res.status(500).json({ error: "Registration failed" });
        }
    }
});

// Login routes
app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "login.html"));
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        req.session.user = {
            id: user._id,
            username: user.username,
            email: user.email
        };

        res.json({ message: "Login successful", username: user.username });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Login failed" });
    }
});

// Logout route
app.get("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: "Logout failed" });
        }
        res.clearCookie("connect.sid");
        res.redirect("/login");
    });
});

// Course routes
app.get("/api/courses", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const courses = await Course.find();
        res.json(courses);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch courses" });
    }
});

app.get("/api/user/courses", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const user = await User.findById(req.session.user.id).populate('registeredCourses');
        res.json(user.registeredCourses);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch user courses" });
    }
});

app.post("/api/courses/register", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const { courseId } = req.body;

    try {
        // Check if course exists and has capacity
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ error: "Course not found" });
        }
        if (course.enrolled >= course.capacity) {
            return res.status(400).json({ error: "Course is full" });
        }

        // Check if user is already registered
        const user = await User.findById(req.session.user.id);
        if (user.registeredCourses.includes(courseId)) {
            return res.status(400).json({ error: "Already registered for this course" });
        }

        // Update course enrollment
        course.enrolled += 1;
        await course.save();

        // Add course to user's registered courses
        user.registeredCourses.push(courseId);
        await user.save();

        res.json({ message: "Course registration successful", course });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Course registration failed" });
    }
});

app.delete("/api/courses/drop/:courseId", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const { courseId } = req.params;

    try {
        // Remove course from user's registered courses
        const user = await User.findById(req.session.user.id);
        user.registeredCourses = user.registeredCourses.filter(id => id.toString() !== courseId);
        await user.save();

        // Update course enrollment
        const course = await Course.findById(courseId);
        if (course) {
            course.enrolled = Math.max(0, course.enrolled - 1);
            await course.save();
        }

        res.json({ message: "Course dropped successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to drop course" });
    }
});

// Home route
app.get("/home", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }
    res.sendFile(path.join(__dirname, "views", "home.html"));
});

// Get current user info
app.get("/api/user", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    res.json(req.session.user);
});

// Start server and seed courses
app.listen(PORT, async () => {
    console.log(`Server running at http://localhost:${PORT}`);
    await seedCourses();
});