const {
    validationResult
} = require('express-validator');


const Appointment = require('../models/appointments');
const Doctor = require('../models/doctor');
const Patient = require('../models/patient');

const addFamilyDoctor = async (req, res, next) => {
    let doctor = await Doctor.findById(req.body.doctor)
    let patient = await Patient.findById(req.body.patient)
    const currFamilyDoctor = {
        _id: doctor._id,
        image: doctor.image,
        name: doctor.name,
        lastName: doctor.lastName,
        email: doctor.email,
        address: doctor.address,
        type: doctor.type,
        city: doctor.city,
        lat: doctor.lat,
        lng: doctor.lng,
    }
    try {

        patient.familyDoctor = currFamilyDoctor
        await patient.save()

        res.status(201).json({
            message: `doctor ${doctor.name}  ${doctor.lastName} is your family doctor now`,
            familyDoctor: currFamilyDoctor
        });
    } catch (err) {
        return next(error);
    }
};
const addFamilyDoctorRemove = async (req, res, next) => {
    let doctor = await Doctor.findById(req.body.doctor)
    let patient = await Patient.findById(req.body.patient)
    const currFamilyDoctor = {
        _id: doctor._id,
        image: doctor.image,
        name: doctor.name,
        lastName: doctor.lastName,
        email: doctor.email,
        address: doctor.address,
        type: doctor.type,
        city: doctor.city,
        lat: doctor.lat,
        lng: doctor.lng,
    }
    try {

        patient.familyDoctor = {}
        await patient.save()

        res.status(201).json({
            message: `doctor ${doctor.name}  ${doctor.lastName} has been removed from being your family doctor`,
        });
    } catch (err) {
        return next(error);
    }
};
const creatUser = async (req, res, next) => {
    const type = req.params.type
    const body = req.body
    let newDoctor, newPatient

    type === "doctor" ? newDoctor = new Doctor(body) : newPatient = new Patient(body)
    try {
        type === "doctor" ?
            await newDoctor.save() :
            await newPatient.save()
    } catch (err) {
        return next(error);
    }
    type === "doctor" ?
        res.status(201).json({
            newDoctor
        }) :
        res.status(201).json({
            newPatient
        })
};
const getAllDoctors = async (req, res, next) => {

    let doctors = await Doctor.find()
    try {
        res.status(201).json({
            doctors
        })
    } catch (err) {
        return next(error);
    }

};
const getDoctor = async (req, res, next) => {

    let appointments = []
    try {
        let doctor = await Doctor.findById(req.params.id)
        res.status(201).json({
            doctor,
            appointments: doctor.appointments
        })
    } catch (err) {
        return next(error);
    }
};
const getPatient = async (req, res, next) => {
    let patient = await Patient.findById("61f6d81c7cbe6d3235e2b7b2")
    try {
        res.status(201).json({
            patient,
            appointments: patient.appointments
        })
    } catch (err) {
        return next(error);
    }

};


exports.getDoctor = getDoctor
exports.creatUser = creatUser
exports.getPatient = getPatient
exports.getAllDoctors = getAllDoctors
exports.addFamilyDoctor = addFamilyDoctor
exports.addFamilyDoctorRemove = addFamilyDoctorRemove