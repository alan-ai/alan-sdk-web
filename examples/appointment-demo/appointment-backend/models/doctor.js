const mongoose = require('mongoose')

const doctorSchema = mongoose.Schema({
    image: {
        type: String
    },
    name: {
        type: String
    },
    lastName: {
        type: String
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        // required: true,
        minlength: 6
    },
    type: {
        type: String,
        required: true
    },
    speciality: {
        type: String,

    },
    // appointments: [{
    //     type: mongoose.Types.ObjectId,
    //     ref: 'Appointment'
    // }],
    // appointments: [{
    //     type: mongoose.Types.ObjectId,
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
    visitedPatients: [{
        type: String,
    }],

})
module.exports = mongoose.model('Doctor', doctorSchema)