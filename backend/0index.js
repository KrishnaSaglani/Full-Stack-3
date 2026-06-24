const express = require('express');
const sql = require('mssql/msnodesqlv8');
const cors = require('cors');
const app = express();


app.use(cors());
app.use(express.json());

const config = {
    connectionString: 'Driver={ODBC Driver 17 for SQL Server};Server=localhost\\SQLEXPRESS01;Database=KSChat;Trusted_Connection=yes;',
};


app.post('/login', async function (req, res) {

    const {user, pwd} = req.body;

    const pool = await sql.connect(config);
    const result = await pool.request().input('user', sql.NVarChar, user).input('pwd',sql.NVarChar, pwd).query("Select * from users where UserName= @user and UserPass = @pwd");
    if(result.recordset.length>0 )
    {
        res.json({
            okay:true
        })
    }
    else{

        res.status(401).json({
            okay:false,
            message:"User Not Found"
        }
        )
    }
    
})


app.post('/register', async function (req, res) {

    const {user, pwd} = req.body;

    const pool = await sql.connect(config);
    const result = await pool.request().input('user', sql.NVarChar, user).input('pwd',sql.NVarChar, pwd).query("insert into users(UserName, UserPass) values (@user, @pwd)");
            
    if (result.rowsAffected[0] > 0) {
            res.json({
                okay: true,
                message: "User registered successfully!"
            });
            } else {
            res.status(500).json({
                okay: false,
                message: "Failed to insert user."
            });
        }
            
})


const PORT =3000;
app.listen(PORT, ()=> 
{
    console.log(`Server is live at http://localhost:${PORT}/login`);
    console.log(`Press Ctrl+C to stop the server`);
}
)