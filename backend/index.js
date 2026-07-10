const express = require('express');

// socket.io requires http connection
const http = require("http");


const sql = require('mssql/msnodesqlv8');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

// connecting frontend and backend:
const path = require("path");
app.use(express.static(path.join(__dirname, "../frontend")));


// Now creating server itself:
const server = http.createServer(app);
    // Because Socket.IO needs the HTTP server, not the Express app.

// Initializing socket.io
const {Server} = require("socket.io");

const io = new Server(server,{
    cors:{
        origin:"*"
    }
});




const config = {
    connectionString: 'Driver={ODBC Driver 17 for SQL Server};Server=localhost\\SQLEXPRESS01;Database=KSChat;Trusted_Connection=yes;',
};

// PRE-CONNECT: Create a connection pool globally

//this is basically a function
// 1. Create a variable to hold our connection
let pool;
const initializeDatabase = require("./db_init");
// 2. Create a function that handles the connection
async function connectToDatabase() {
    try {
        // Try to connect and store it in our 'pool' variable
        pool = await sql.connect(config);
        console.log(' Connected to MSSQL Database');

        await initializeDatabase(pool);

    } catch (err) {
        // If it fails, tell us exactly why
        console.error(' Database Connection Failed!', err.message);
    }
}


// 3. Call the function immediately

connectToDatabase();


// base get to get it started
app.get("/", function(req, res){

    res.sendFile(
        path.join(__dirname, "../frontend/login_screen/login.html")
    );

});

app.post('/login', async function (req, res) {
    try {
        const { user, pwd } = req.body;        
        const result = await pool.request()
            .input('user', sql.NVarChar, user)
            .input('pwd', sql.NVarChar, pwd)
            .query("SELECT * FROM users WHERE UserName = @user AND password = @pwd");

        // Anyone can bypass your frontend and call your API directly. So double check!
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
            .query("INSERT INTO users (UserName, password) VALUES (@user, @pwd)");

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


app.post('/create_room', async function(req, res){

    try{
        const { creator, name, description, max_members, rule, activeFor } = req.body;
        

        if (!name || !description || !creator) {
                return res.status(400).json({
                    okay: false,
                    failure_message: "Missing required fields."
                });
            }


    const result = await pool.request()
        .input("creator", sql.NVarChar, creator)
        .input("name", sql.NVarChar, name)
        .input("description", sql.NVarChar, description)
        .input("max_members", sql.Int, max_members)
        .input("rule", sql.NVarChar, rule)
        .input("active_for", sql.Int, activeFor)
        .query(`
            INSERT INTO Chatrooms
            (
                creator,
                name,
                description,
                max_members,
                chatroom_rule,
                active_for
            )
            OUTPUT INSERTED.chatroom_id
            VALUES
            (
                @creator,
                @name,
                @description,
                @max_members,
                @rule,
                @active_for
            );
        `);

        // Using OUTPUT INSERTED.chatroom_id is the standard 
        // SQL Server way to retrieve the ID of the row that was just inserted.


        const chatroom_id = result.recordset[0].chatroom_id;
        return res.json(
            {
                okay:true,
                chatroom_id:chatroom_id
            }
        )
    }
    catch(err)
    {
        console.error(err);
        // need to do this also!!
        res.status(500).json(
            {
                okay:false,
                failure_message:"Server Error backend"
            }
        )
    }

} );

app.get('/refresh_chatrooms', async function(req, res) {
   try{
        const expired_rooms = await pool.request()
                        .query(`select * from Chatrooms
                            where dateadd(DAY, active_for, date_created) 
                            < cast(getdate() as date)`);

        for( const room of expired_rooms.recordset)
        {
            console.log(`Deleting expired room tables for ${room.name}`);
            const chatroom_id = room.chatroom_id;
                        const result = await pool.request().input("chatroom_id", sql.Int, chatroom_id)
                        .query(`DECLARE @RoomTable NVARCHAR(128);
                                DECLARE @MembersTable NVARCHAR(128);
                                DECLARE @SQL NVARCHAR(MAX);

                                SET @RoomTable = 'Room_' + CAST(@chatroom_id AS VARCHAR(20));
                                SET @MembersTable = @RoomTable + '_Members';

                                -- Check Members table
                                IF OBJECT_ID(@MembersTable, 'U') IS NULL
                                BEGIN
                                    THROW 50003, 'Chatroom members table does not exist.', 1;
                                END

                                -- Check Room table
                                IF OBJECT_ID(@RoomTable, 'U') IS NULL
                                BEGIN
                                    THROW 50004, 'Chatroom table does not exist.', 1;
                                END

                                SET @SQL = '
                                DROP TABLE ' + QUOTENAME(@MembersTable) + ';
                                DROP TABLE ' + QUOTENAME(@RoomTable) + ';
                                ';

                                EXEC sp_executesql @SQL;`);
            
            
            await pool.request()
            .input("id", sql.Int, room.chatroom_id)
            .query(`
                DELETE FROM Chatrooms
                WHERE chatroom_id=@id
            `);
            console.log(`Removed room ${room.name} from Chatrooms table`);


        }

        console.log(`Removed ${expired_rooms.recordset.length} Chatrooms due to expiry`);
        return res.json({
            okay:true
        })

        

        }
    catch(err)
    {
        console.error(err);
        res.json(
            {
                okay:false,
                message:err.message
            }
        )
    }
    
});


app.get('/retrieve_chatrooms', async function (req, res){

    const result = await pool.request()
                    .query(`select * from Chatrooms`);

    res.json(result.recordset);

});


app.post("/delete_chatroom", async function (req, res){
    const {chatroom_id} = req.body;
    // Name has to be the SAME as sent in script
    try{
        const result = await pool.request().input("chatroom_id", sql.Int, chatroom_id)
                    .query(`delete from Chatrooms where 
                        chatroom_id = @chatroom_id`);
        
        if(result.rowsAffected[0]===0)
        {
            return res.json({
                okay:false,
                message:"Unable to find room"
            })
        }
        else{
            console.log(`Chatroom ${chatroom_id} deleted successfully from Chatrooms table!`);
        }




        //Now remove the corresponding tables also!!

        console.log(`Removing Tables for chatroom: ${chatroom_id}`);

        await pool.request().input("chatroom_id", sql.Int, chatroom_id)
                        .query(`DECLARE @RoomTable NVARCHAR(128);
                                DECLARE @MembersTable NVARCHAR(128);
                                DECLARE @SQL NVARCHAR(MAX);

                                SET @RoomTable = 'Room_' + CAST(@chatroom_id AS VARCHAR(20));
                                SET @MembersTable = @RoomTable + '_Members';

                                -- Check Members table
                                IF OBJECT_ID(@MembersTable, 'U') IS NULL
                                BEGIN
                                    THROW 50003, 'Chatroom members table does not exist.', 1;
                                END

                                -- Check Room table
                                IF OBJECT_ID(@RoomTable, 'U') IS NULL
                                BEGIN
                                    THROW 50004, 'Chatroom table does not exist.', 1;
                                END

                                SET @SQL = '
                                DROP TABLE ' + QUOTENAME(@MembersTable) + ';
                                DROP TABLE ' + QUOTENAME(@RoomTable) + ';
                                ';

                                EXEC sp_executesql @SQL;`);

        console.log(`Removed room_id: ${chatroom_id} from Chatrooms table`);

        res.json({
                okay:true
            })
            
    }
    catch(err)
    {
        console.error(err);
        res.status(500).json({
            okay:false,
            message:"Server Error"
        })
    }
    
});


app.post("/create_tables",async function(req, res){
    const {chatroom_id} = req.body;

    try{
        const result=await pool.request().input("chatroom_id",sql.Int, chatroom_id)
        .query(`DECLARE @TableName NVARCHAR(128);
                    DECLARE @SQL NVARCHAR(MAX);

                    SET @TableName = 'Room_' + CAST(@chatroom_id AS VARCHAR(20));

                    IF OBJECT_ID(@TableName, 'U') IS NOT NULL
                    BEGIN
                        THROW 50001, 'Chatroom table already exists.', 1;
                    END

                    SET @SQL = '
                    CREATE TABLE ' + QUOTENAME(@TableName) + ' (

                        chat_id INT IDENTITY(1,1) PRIMARY KEY,

                        sender NVARCHAR(100) NOT NULL,

                        notif NVARCHAR(50),

                        sent_at DATETIME NOT NULL DEFAULT GETDATE(),

                        deleted BIT NOT NULL DEFAULT 0,

                        replying BIT NOT NULL DEFAULT 0,
                        
                        replying_to NVARCHAR(50),

                        message NVARCHAR(MAX) NOT NULL

                    );';

                    EXEC sp_executesql @SQL;`);

    }
    catch(err)
    {
        console.error(err);
        return res.json(
            {
                okay:false,
                message:`Unable to create room table for room_id: ${chatroom_id}`
            }
        )

    }


    // Now creating the members table similarly:
    try{
        const result = await pool.request().input("chatroom_id", sql.Int, chatroom_id)
        .query(`DECLARE @TableName NVARCHAR(128);
            DECLARE @SQL NVARCHAR(MAX);

            SET @TableName = 'Room_' + CAST(@chatroom_id AS VARCHAR(20)) + '_Members';

            IF OBJECT_ID(@TableName, 'U') IS NOT NULL
            BEGIN
                THROW 50002, 'Chatroom members table already exists.', 1;
            END

            SET @SQL = '
            CREATE TABLE ' + QUOTENAME(@TableName) + ' (

                member_id INT IDENTITY(1,1) PRIMARY KEY,

                member_name NVARCHAR(100) NOT NULL UNIQUE

            );';

            EXEC sp_executesql @SQL;`);


            res.json({
                okay:true
            })
    }catch(err)
    {
        console.log(err);
        res.json(
            {
                okay:false,
                message:`Unable to create room table for room_id: ${chatroom_id}`
            }
        )
    }





});



app.post("/load_chats", async function(req, res){
    const{chatroom_id, last_chat_id} = req.body;
    try{
        const room_name = `Room_${chatroom_id}`;
        const result = await pool.request()
        .input("room_name", sql.NVarChar, room_name)
        .input("last_chat_id", sql.Int, last_chat_id)
        .query(`

            DECLARE @SQL NVARCHAR(MAX);

            SET @SQL = '
            SELECT *
            FROM ' + QUOTENAME(@room_name) + '
            WHERE chat_id > @last_chat_id
            ORDER BY chat_id;
            ';

            EXEC sp_executesql
                @SQL,
                N'@last_chat_id INT',
                @last_chat_id = @last_chat_id;
            
            `);


        res.json({
            okay:true,
            new_chats:result.recordset
        })
        
    }
    catch(err)
    {
        console.error(err);
        res.json({
            okay:false,
            message:err.message
        })
    }
});

app.post("/load_edited_chat", async function(req, res){
    const{chatroom_id, edited_id} = req.body;
    try{
        const room_name = `Room_${chatroom_id}`;
        const result = await pool.request()
        .input("room_name", sql.NVarChar, room_name)
        .input("edited_id", sql.Int, edited_id)
        .query(`

            DECLARE @SQL NVARCHAR(MAX);

            SET @SQL = '
            SELECT *
            FROM ' + QUOTENAME(@room_name) + '
            WHERE chat_id = @edited_id;
            ';

            EXEC sp_executesql
                @SQL,
                N'@edited_id  INT',
                @edited_id = @edited_id;
            
            `);


        res.json({
            okay:true,
            new_chats:result.recordset
        })
        
    }
    catch(err)
    {
        console.error(err);
        res.json({
            okay:false,
            message:err.message
        })
    }
});





async function rollbackMemberCount(chatroom_id){

    await pool.request()
        .input("chatroom_id", sql.Int, chatroom_id)
        .query(`
            UPDATE Chatrooms
            SET current_members=current_members-1
            WHERE chatroom_id=@chatroom_id
        `);

}
app.post("/add_member", async function(req, res){
    const{user, chatroom_id} = req.body;
    const chatroom_name = `Room_${chatroom_id}_Members`;
    try{
        // first check in Chatrooms if for this id, is current_members<max_members?
        const result1 = await pool.request().input("chatroom_id", sql.Int, chatroom_id)
        .query(`update Chatrooms
            set current_members = current_members+1
            where chatroom_id = @chatroom_id
            and current_members < max_members`);
        

        if(result1.rowsAffected[0]===0)
        {
            return res.json({
                okay:false,
                message:"Chatroom already full."
            })
        }
        else
        {
            
            // current_members<max_members
            console.log(`Chatroom ${chatroom_id} has enough space for you to enter`);

            // Now add the members in
            try{
                const result2 = await pool.request().input("chatroom_name", sql.NVarChar, chatroom_name)
                .input("user", sql.NVarChar, user)
                .query(`DECLARE @SQL NVARCHAR(MAX);

                SET @SQL = '
                INSERT INTO ' + QUOTENAME(@chatroom_name) + '
                (member_name)

                VALUES (@user);
                ';

                EXEC sp_executesql
                    @SQL,
                    N'@user NVARCHAR(100)',
                    @user = @user;`);
                // query should add this user into the table with name @chatroom_name
                // basically an insert query
                res.json({
                    okay:true
                })
            }
            catch(err)
            {
                console.log("Unable to add you into actual chatroom list")
                
                if(err.number === 2627 || err.number === 2601)
                    {
                        // doing rollback, removing one extra added member
                        await rollbackMemberCount(chatroom_id);
                        return res.json({
                            okay:false,
                            message:"You are already a member of this chatroom."
                        });
                    }

                else
                {
                    // doing rollback, removing one extra added member
                        await rollbackMemberCount(chatroom_id);
                    
                    return res.json(
                    {
                        okay:false,
                        message:`Unable to enter data into tables for ${user}`
                    }
                )

                }
            }
            
        }
    }
    catch(err)
    {
        console.error(err);

        return res.json({
            okay:false,
            message:"Server Error pls try again."
        })
    }
});


app.post("/remove_member", async function(req, res){
    const{user, chatroom_id} = req.body;
    const chatroom_name = `Room_${chatroom_id}_Members`;
    try{

        // Remove from chatroom first
        const result2 = await pool.request().input("chatroom_name", sql.NVarChar, chatroom_name)
                .input("user", sql.NVarChar, user)
                .query(`DECLARE @SQL NVARCHAR(MAX);

                    SET @SQL = '
                    DELETE FROM ' + QUOTENAME(@chatroom_name) + '
                    WHERE member_name = @user;

                    IF @@ROWCOUNT = 0
                    BEGIN
                        THROW 50011, ''User is not a member of this chatroom.'', 1;
                    END
                    ';

                    EXEC sp_executesql
                        @SQL,
                        N'@user NVARCHAR(100)',
                        @user = @user;`);



            console.log(`Successfully removed from Room_${chatroom_id}`);

        // reducing current_members count!
        await pool.request().input("chatroom_id", sql.Int, chatroom_id)
        .query(`update Chatrooms
            set current_members = current_members-1
            where chatroom_id = @chatroom_id
            AND current_members>0;`);


            res.json({
                okay:true
            })


    }
    catch(err)
    {
        console.error(err);
         if(err.number === 50011)
            {
                return res.json({
                    okay:false,
                    message:"You are not a member of this chatroom."
                });
            }

            res.json({
                okay:false,
                message:"Server Error"
            })
    }
});




app.post("/upload_chat", async function(req, res){

    // console.log(req.body);

        const {
        room_id,
        sender,
        notif = "none",
        replying = false,
        replying_to = "none",
        deleted = false,
        message
    } = req.body;

    // console.log(room_id);

    try{

        const room_name = `Room_${room_id}`;

        const result = await pool.request()
            .input("room_name", sql.NVarChar, room_name)
            .input("sender", sql.NVarChar, sender)
            .input("notif", sql.NVarChar, notif)
            .input("replying", sql.Bit, replying)
            .input("replying_to", sql.NVarChar, replying_to)
            .input("deleted", sql.Bit, deleted)
            .input("message", sql.NVarChar(sql.MAX), message)
            .query(`
                DECLARE @SQL NVARCHAR(MAX);

                SET @SQL = '
                    INSERT INTO ' + QUOTENAME(@room_name) + '
                    (
                        sender,
                        notif,
                        sent_at,
                        replying,
                        replying_to,
                        deleted,
                        message
                    )
                    VALUES
                    (
                        @sender,
                        @notif,
                        GETDATE(),
                        @replying,
                        @replying_to,
                        @deleted,
                        @message
                    );
                ';

                EXEC sp_executesql
                    @SQL,
                    N'
                        @sender NVARCHAR(100),
                        @notif NVARCHAR(255),
                        @replying BIT,
                        @replying_to NVARCHAR(255),
                        @deleted BIT,
                        @message NVARCHAR(MAX)
                    ',
                    @sender=@sender,
                    @notif=@notif,
                    @replying=@replying,
                    @replying_to=@replying_to,
                    @deleted=@deleted,
                    @message=@message;
            `);


        // if there is success, then emit this chat to all chatrooms from the backend!!
        // This emit occurs from backend!!

        io.to(room_name).emit("new_message", {room_id:room_id});
        console.log(`Emmited message ${message} from backend by ${sender}`);

        res.json({
            okay: true
        });

    }
    catch(err){

        console.error(err);

        res.json({
            okay: false,
            message: err.message
        });

    }
});

app.post("/edit_chat", async function(req, res){

    // console.log(req.body);

        const {
        room_id,
        sender,
        notif = "none",
        replying = false,
        replying_to = "none",
        deleted = false,
        message,
        chat_id
    } = req.body;

    // console.log(room_id);

    try{

        const room_name = `Room_${room_id}`;

        const result = await pool.request()
            .input("room_name", sql.NVarChar, room_name)
            .input("sender", sql.NVarChar, sender)
            .input("notif", sql.NVarChar, notif)
            .input("replying", sql.Bit, replying)
            .input("replying_to", sql.NVarChar, replying_to)
            .input("deleted", sql.Bit, deleted)
            .input("message", sql.NVarChar(sql.MAX), message)
            .input("chat_id",sql.Int,chat_id)
            .query(`
                DECLARE @SQL NVARCHAR(MAX);

                SET @SQL = '
                    UPDATE ' + QUOTENAME(@room_name) + '
                    SET
                        sender = @sender,
                        notif = @notif,
                        sent_at = GETDATE(),
                        replying = @replying,
                        deleted = @deleted,
                        message = @message,
                        replying_to = @replying_to
                    WHERE chat_id = @chat_id;

                    IF @@ROWCOUNT = 0
                    BEGIN
                        THROW 50013, ''Message not found.'', 1;
                    END
                ';

                EXEC sp_executesql
                    @SQL,
                    N'
                        @sender NVARCHAR(100),
                        @notif NVARCHAR(100),
                        @replying BIT,
                        @deleted BIT,
                        @message NVARCHAR(MAX),
                        @replying_to NVARCHAR(100),
                        @chat_id INT
                    ',
                    @sender = @sender,
                    @notif = @notif,
                    @replying = @replying,
                    @deleted = @deleted,
                    @message = @message,
                    @replying_to = @replying_to,
                    @chat_id = @chat_id;

            `);

        console.log(`Edited chat with : ${message}`);

        // Emit to all others

        io.to(room_name).emit("edited_message", {room_id, chat_id});
        console.log(`[EMMITED] Edited chat: ${message}`);
        res.json({
            okay: true
        });

    }
    catch(err){

        console.error(err);

        res.json({
            okay: false,
            message: err.message
        });

    }
});



app.post("/delete_chat", async function(req, res){

    // console.log(req.body);

        const {
        room_id,
        chat_id
    } = req.body;

    console.log(`Deleting chat from room_id ${room_id}`);

    try{

        const room_name = `Room_${room_id}`;

        const result = await pool.request()
            .input("room_name", sql.NVarChar, room_name)
            .input("chat_id", sql.Int, chat_id)
            .query(`
                DECLARE @SQL NVARCHAR(MAX);

                SET @SQL = '
                    UPDATE ' + QUOTENAME(@room_name) + '
                    SET
                        deleted = 1,
                        message = ''''
                    WHERE chat_id = @chat_id;

                    IF @@ROWCOUNT = 0
                    BEGIN
                        THROW 50012, ''Message not found.'', 1;
                    END
                ';

                EXEC sp_executesql
                    @SQL,
                    N'@chat_id INT',
                    @chat_id = @chat_id;
            `);


        // Emit deleted message to all
        io.to(room_name).emit("deleted_message",{room_id, chat_id});
        console.log(`[EMMITED] deleted chat`);

        res.json({
            okay: true
        });

    }
    catch(err){

        console.error(err);

        if(err.number === 50012)
        {
            return res.json({
                okay: false,
                message: "Message not found."
            });
        }


        return res.json({
            okay: false,
            message: err.message
        });

    }
});




// app.post("/edit_chat", async function(req, res){

//     // console.log(req.body);

//         const {
//         room_id,
//         chat_id
//     } = req.body;

//     console.log(`Deleting chat from room_id ${room_id}`);

//     try{

//         const room_name = `Room_${room_id}`;

//         const result = await pool.request()
//             .input("room_name", sql.NVarChar, room_name)
//             .input("chat_id", sql.Int, chat_id)
//             .query(`
//                 DECLARE @SQL NVARCHAR(MAX);

//                 SET @SQL = '
//                     UPDATE ' + QUOTENAME(@room_name) + '
//                     SET
//                         deleted = 1,
//                         message = ''''
//                     WHERE chat_id = @chat_id;

//                     IF @@ROWCOUNT = 0
//                     BEGIN
//                         THROW 50012, ''Message not found.'', 1;
//                     END
//                 ';

//                 EXEC sp_executesql
//                     @SQL,
//                     N'@chat_id INT',
//                     @chat_id = @chat_id;
//             `);

//         res.json({
//             okay: true
//         });

//     }
//     catch(err){

//         console.error(err);

//         if(err.number === 50012)
//         {
//             return res.json({
//                 okay: false,
//                 message: "Message not found."
//             });
//         }


//         return res.json({
//             okay: false,
//             message: err.message
//         });

//     }
// });

// app.post("/reply_chat", async function(req, res){

//     // console.log(req.body);

//         const {
//         room_id,
//         chat_id
//     } = req.body;

//     console.log(`Replying to chat from room_id ${room_id}`);

//     try{

//         const room_name = `Room_${room_id}`;

//         const result = await pool.request()
//             .input("room_name", sql.NVarChar, room_name)
//             .input("chat_id", sql.Int, chat_id)
//             .query(`
//                 DECLARE @SQL NVARCHAR(MAX);

//                 SET @SQL = '
//                     UPDATE ' + QUOTENAME(@room_name) + '
//                     SET
//                         deleted = 1,
//                         message = ''''
//                     WHERE chat_id = @chat_id;

//                     IF @@ROWCOUNT = 0
//                     BEGIN
//                         THROW 50012, ''Message not found.'', 1;
//                     END
//                 ';

//                 EXEC sp_executesql
//                     @SQL,
//                     N'@chat_id INT',
//                     @chat_id = @chat_id;
//             `);

//         res.json({
//             okay: true
//         });

//     }
//     catch(err){

//         console.error(err);

//         if(err.number === 50012)
//         {
//             return res.json({
//                 okay: false,
//                 message: "Message not found."
//             });
//         }


//         return res.json({
//             okay: false,
//             message: err.message
//         });

//     }
// });



app.get('/trending_rooms', async function (req, res){

    const result = await pool.request()
                    .query(`select top 10 * from Chatrooms
                        where current_members<max_members
                        order by current_members desc`);

    res.json(
        {
            okay:true,
            trending:result.recordset
        }
    );

});

app.post('/load_members', async function(req, res){

    const{room_id} = req.body;

    try{

        const table_name = `Room_${room_id}_Members`;

        const result = await pool.request()
            .input("table_name", sql.NVarChar, table_name)
            .query(`
                DECLARE @SQL NVARCHAR(MAX);

                SET @SQL = '
                    SELECT member_name
                    FROM ' + QUOTENAME(@table_name) + '
                    ORDER BY member_name;
                ';

                EXEC sp_executesql @SQL;
            `);

        res.json({
            okay:true,
            members: result.recordset
        })

    }
    catch(err)
    {
        console.log(err);
    }

});

const PORT = 3000;
// app.listen(PORT, () => {
//     console.log(`Server live at http://localhost:${PORT}`);
// });

// now socket.io server listens at port 3000
server.listen(3000,function(){

    console.log("Server live at http://localhost:3000");

});

// Whenever someone opens your website you'll see "New user connected".

// initially, there is no socket, so we use io.on instead of socket.on
io.on("connection", function(socket){

    console.log(`User connected! Socket ID: ${socket.id}`);

    socket.on("disconnect", function(){

        console.log(`User disconnected! Socket ID: ${socket.id}`);

    });

    socket.on("join_room", function(data){

        const roomName = `Room_${data.chatroom_id}`;

        // This is a Socket.IO room, not your SQL table.
        socket.join(roomName);

        console.log(`${data.username} joined room ${roomName}`);

    });

    socket.on("leave_room", function(data){

        const roomName = `Room_${data.chatroom_id}`;

        socket.leave(roomName);

        console.log(`${data.username} left ${roomName}`);

    });

});