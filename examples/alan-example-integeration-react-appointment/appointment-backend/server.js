const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const path = require('path')

const appointmentRoutes = require("./routes/appointment-routes");
const userRoutes = require("./routes/userRoutes");

const dotenv = require("dotenv");

const app = express();

dotenv.config();

app.use(bodyParser.json());
app.use(
    bodyParser.urlencoded({
        extended: false,
    })
);
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PATCH, DELETE, OPTIONS"
    );
    next();
});


app.use("/create-appointment", appointmentRoutes);
app.use("/appointments", appointmentRoutes);
app.use("/create-user", userRoutes);
app.use("/user", userRoutes);
app.use('/', express.static('../appointment-frontend/build'));
app.get('*', (req, res) => res.sendFile(path.join(__dirname + '/../appointment-frontend/build/index.html')))


app.get('/', (req, res, next) => {

    res.status(200).json({
        status: 'success',
        data: {
            name: 'name of your app',
            version: '0.1.0'
        }
    });

});

const PORT = process.env.PORT || 8080

mongoose
    .connect(
        // process.env.MONGO_URL
        'mongodb+srv://LailyS:Mango4Laily123%3F@cluster0.e9c8z.mongodb.net/myFirstDatabase?retryWrites=true&w=majority'
    )
    .then(() => {
        console.log("mongodb is connected!");
        app.listen(PORT);
    })
    .catch((err) => {
        console.log(err);
    });