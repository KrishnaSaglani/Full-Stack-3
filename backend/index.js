const express = require('express');
const sql = require('mssql/msnodesqlv8');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const config = {
    connectionString: 'Driver={ODBC Driver 17 for SQL Server};Server=localhost\\SQLEXPRESS01;Database=KSChat;Trusted_Connection=yes;',
};

// PRE-CONNECT: Create a connection pool globally

//this is basically a function
// 1. Create a variable to hold our connection
let pool;

// 2. Create a function that handles the connection
async function connectToDatabase() {
    try {
        // Try to connect and store it in our 'pool' variable
        pool = await sql.connect(config);
        console.log(' Connected to MSSQL Database');
    } catch (err) {
        // If it fails, tell us exactly why
        console.error(' Database Connection Failed!', err.message);
    }
}

// 3. Call the function immediately
connectToDatabase();



app.post('/login', async function (req, res) {
    try {
        const { user, pwd } = req.body;        
        const result = await pool.request()
            .input('user', sql.NVarChar, user)
            .input('pwd', sql.NVarChar, pwd)
            .query("SELECT * FROM users WHERE UserName = @user AND UserPass = @pwd");

        if (result.recordset.length > 0) {
            res.json({ okay: true });
        } else {
            res.status(401).json({ okay: false, message: "Invalid username or password" });
        }
    } catch (err) {
        res.status(500).json({ okay: false, message: "Server Error" });
    }
});

app.post('/register', async function (req, res) {
    try {
        const { user, pwd } = req.body;
        const result = await pool.request()
            .input('user', sql.NVarChar, user)
            .input('pwd', sql.NVarChar, pwd)
            .query("INSERT INTO users (UserName, UserPass) VALUES (@user, @pwd)");

        if (result.rowsAffected[0] > 0) {
            res.json({ okay: true, message: "User registered successfully!" });
        }
    } catch (err) {
        // Handle Duplicate Username (SQL Error 2627 or 2601)
        if (err.number === 2627 || err.number === 2601) {
            res.status(400).json({ okay: false, message: "Username already exists!" });
        } else {
            console.error(err);
            res.status(500).json({ okay: false, message: "Registration failed" });
        }
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server live at http://localhost:${PORT}`);
});