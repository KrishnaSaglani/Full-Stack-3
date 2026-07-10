// db_init.js

async function initializeDatabase(pool)
{
    try
    {

        console.log("Checking database...");

        await pool.request().query(`
            IF OBJECT_ID('Users', 'U') IS NULL
            BEGIN
                CREATE TABLE Users
                (
                    username NVARCHAR(100) PRIMARY KEY,
                    password NVARCHAR(255) NOT NULL
                );
            END

            IF OBJECT_ID('Chatrooms', 'U') IS NULL
            BEGIN
                CREATE TABLE Chatrooms
                (
                    chatroom_id INT IDENTITY(1,1) PRIMARY KEY,

                    name NVARCHAR(255) NOT NULL,

                    description NVARCHAR(MAX),

                    max_members INT NOT NULL,

                    current_members INT NOT NULL DEFAULT 0,

                    creator NVARCHAR(100) NOT NULL,

                    chatroom_rule NVARCHAR(MAX),

                    date_created DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
                    
                    active_for INT NOT NULL
                );
            END
        `);

        console.log("Database initialized successfully.");
    }
    catch(err)
    {
        console.error("Database initialization failed.");
        console.error(err);
    }
}

module.exports = initializeDatabase;