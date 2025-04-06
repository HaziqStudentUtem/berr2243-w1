const { MongoClient } = require('mongodb');

const drivers = [
    {
        name: "John Doe",
        vehicleType: "Sedan",
        isAvailable: true,
        rating: 4.8,
    },
    {
        name: "Alice Smith",
        vehicleType: "SUV",
        isAvailable: false,
        rating: 4.5,
    },
    { 
        name: "Sayed Faisal",
        vehicleType: "Truck",
        isAvailable: true,
        rating: 4.3,
    }
];

console.log(drivers);   

async function main() {
const uri = "mongodb://localhost:27017"
const client = new MongoClient(uri);

try {
    await client.connect();
    const db = client.db("testDB");

    const driversCollection = db.collection("drivers");

    drivers.forEach(async (driver) => {
        const result = await driversCollection.insertOne(driver);
        console.log(`New driver created with result: ${result}`);
    });

    const availableDrivers = await db.collection("drivers").find({
        isAvailable: true,
        rating: { $gte:4.5 }
    }).toArray();
    console.log("Available drivers:", availableDrivers);

    const updateResult = await db.collection("drivers").updateOne(
        { name: "John Doe" },
        { $inc: { rating: 0.1 } }
    );
    console.log(`Driver updated with result: ${updateResult}`);

    const deleteResult = await db.collection("drivers").deleteOne({ isAvailable: false });
    console.log(`Driver deleted with result: ${deleteResult}`);

} 

finally {
await client.close();
}
}
main();
