const {
    validationResult
} = require('express-validator');


const Appointment = require('../models/appointments');
const Patient = require('../models/patient');
const Doctor = require('../models/doctor');


const creatAppointment = async (req, res, next) => {
    const errors = validationResult(req);
    console.log(errors, "------>44")

    const currDoctor = req.params.patientDoctor
    let newAppointment

    try {
        // this is a one user model----->
        const patient = await Patient.findById("61f6d81c7cbe6d3235e2b7b2")
        const doctor = await Doctor.findById(currDoctor)
        const appointmentId = patient._id + "#" + doctor._id + "#" + req.body.start

        const newAppointment = {
            _id: appointmentId,
            ...req.body,
            doctorName: doctor.name,
            doctorLastName: doctor.lastName
        }

        doctor.appointments.push(newAppointment)
        patient.appointments.push(newAppointment)
        const currP = {
            _id: patient._id,
            image: patient.image,
            name: patient.name,
            lastName: patient.lastName,
            slot: req.body.start

        }
        const currD = {
            _id: doctor._id,
            image: doctor.image,
            type: doctor.type,
            speciality: doctor.speciality,
            name: doctor.name,
            lastName: doctor.lastName,
            slot: req.body.start

        }
        doctor.visitedPatients.push(appointmentId)
        patient.visitedDoctors.push(appointmentId)

        console.log("doctor.visitedPatients", doctor.visitedPatients)
        console.log("doctor.visitedPatients", doctor.visitedPatients)
        await patient.save()
        await doctor.save()
        res.status(201).json({
            newAppointment,
            message: "your appointmet has been added"
        });
    } catch (err) {
        console.log(err, "------>33")
        return next(err);
    }
};
const getPatientAppointment = async (req, res, next) => {
    let appointments = []
    try {
        const currUser = await Patient.findById("61f6d81c7cbe6d3235e2b7b2")
        for (let index in currUser.appointments) {
            appointments.push(currUser.appointments[index])
        }
        res.status(201).json({
            appointments,
            message: "your appointmet has been added"
        });
    } catch (err) {
        console.log(err, "------>11")
        return next(err);
    }
}
const getDoctorAppointment = async (req, res, next) => {
    const doctor = req.params.doctor
    let appointments = []
    try {
        const currUser = await Doctor.findById(doctor)
        for (let index in currUser.appointments) {
            appointments.push(currUser.appointments[index])
        }
        res.status(201).json({
            appointments
        });

    } catch (err) {
        console.log(err, "------>22")
        return next(err);
    }

}

exports.creatAppointment = creatAppointment
exports.getPatientAppointment = getPatientAppointment
exports.getDoctorAppointment = getDoctorAppointment