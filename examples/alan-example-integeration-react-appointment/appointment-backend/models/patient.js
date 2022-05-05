const mongoose = require('mongoose')

const patientSchema = mongoose.Schema({
    image: {
        type: String
    },
    name: {
        type: String
    },
    Gender: {
        type: String
    },
    BloodType: {
        type: String
    },
    Height: {
        type: String
    },
    Weight: {
        type: String
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    // appointments: [{
    //     type: mongoose.Types.ObjectId,
    //     required: true,
    //     ref: 'Appointment'
    // }],
    appointments: [{
        type: Object,
        required: true
    }],
    address: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    lat: {
        type: Number,
        required: true
    },
    lng: {
        type: Number,
        required: true
    },
    familyDoctor: {
        type: Object,
    },
    visitedDoctors: [{
        type: String,
    }],


})
module.exports = mongoose.model('Patient', patientSchema)