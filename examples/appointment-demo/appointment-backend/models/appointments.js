const mongoose = require('mongoose')

const appointmentSchema = mongoose.Schema({
    patient: {
        type: mongoose.Types.ObjectId,
        required: true,
        ref: 'Patient'
    },
    title: {
        type: String
    },
    description: {
        type: String
    },
    start: {
        type: Date,
        required: true
    },
    end: {
        type: Date,
        required: true
    },
    doctor: {
        type: mongoose.Types.ObjectId,
        required: true,
        ref: 'Doctor'
    },
})
module.exports = mongoose.model('Appointment', appointmentSchema)